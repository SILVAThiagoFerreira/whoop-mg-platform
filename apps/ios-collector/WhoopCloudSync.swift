import Foundation

/// A single timestamped observation emitted by the native iPhone collector.
/// Values are always sent with their provenance; this type intentionally has no
/// raw BLE payload field.
public struct WhoopCloudObservation: Codable, Sendable {
    public let eventId: String
    public let timestamp: Date
    public let metric: String
    public let value: Double
    public let unit: String
    public let source: String
    public let sourceType: String
    public let quality: String
    public let confidence: Double?

    public init(
        eventId: String,
        timestamp: Date,
        metric: String,
        value: Double,
        unit: String,
        source: String,
        sourceType: String = "MEASURED",
        quality: String = "UNKNOWN",
        confidence: Double? = nil
    ) {
        self.eventId = eventId
        self.timestamp = timestamp
        self.metric = metric
        self.value = value
        self.unit = unit
        self.source = source
        self.sourceType = sourceType
        self.quality = quality
        self.confidence = confidence
    }
}

public struct WhoopCloudIngestResult: Codable, Sendable {
    public let accepted: Int
    public let duplicates: Int
    public let status: String
}

public enum WhoopCloudSyncError: Error, LocalizedError, Sendable {
    case invalidEndpoint
    case unauthorized
    case rejected(String)
    case transport(Error)

    public var errorDescription: String? {
        switch self {
        case .invalidEndpoint: return "WHOOP cloud endpoint is invalid."
        case .unauthorized: return "WHOOP cloud authorization expired."
        case .rejected(let message): return message
        case .transport(let error): return error.localizedDescription
        }
    }
}

/// Foreground/background-safe uploader for the iPhone collector.
///
/// The access token is supplied by the host app and is never persisted here.
/// The Apps Script adapter deduplicates by eventId, so retries are safe.
public actor WhoopCloudSync {
    private let endpoint: URL
    private let session: URLSession
    private let encoder: JSONEncoder
    private let decoder: JSONDecoder

    public init(endpointString: String, session: URLSession = .shared) throws {
        guard let endpoint = URL(string: endpointString), endpoint.scheme == "https", endpoint.host != nil else {
            throw WhoopCloudSyncError.invalidEndpoint
        }
        self.endpoint = endpoint
        self.session = session
        self.encoder = JSONEncoder()
        self.encoder.dateEncodingStrategy = .iso8601
        self.decoder = JSONDecoder()
    }

    public func upload(
        _ observations: [WhoopCloudObservation],
        accessToken: String
    ) async throws -> WhoopCloudIngestResult {
        guard !observations.isEmpty else { return WhoopCloudIngestResult(accepted: 0, duplicates: 0, status: "complete") }
        guard !accessToken.isEmpty, accessToken.count <= 4096 else { throw WhoopCloudSyncError.unauthorized }

        var accepted = 0
        var duplicates = 0
        for batch in observations.chunked(into: 250) {
            let payload: [String: AnyEncodable] = [
                "action": AnyEncodable("ingest"),
                "accessToken": AnyEncodable(accessToken),
                "records": AnyEncodable(batch.map { observation in
                    [
                        "eventId": AnyEncodable(observation.eventId),
                        "timestamp": AnyEncodable(observation.timestamp),
                        "metric": AnyEncodable(observation.metric),
                        "value": AnyEncodable(observation.value),
                        "unit": AnyEncodable(observation.unit),
                        "source": AnyEncodable(observation.source),
                        "sourceType": AnyEncodable(observation.sourceType),
                        "quality": AnyEncodable(observation.quality),
                        "confidence": AnyEncodable(observation.confidence),
                    ]
                }),
            ]
            var request = URLRequest(url: endpoint)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.setValue("no-store", forHTTPHeaderField: "Cache-Control")
            request.httpBody = try encoder.encode(payload)
            let data: Data
            let response: URLResponse
            do {
                (data, response) = try await session.data(for: request)
            } catch {
                throw WhoopCloudSyncError.transport(error)
            }
            guard let http = response as? HTTPURLResponse else { throw WhoopCloudSyncError.rejected("Invalid cloud response.") }
            if http.statusCode == 401 { throw WhoopCloudSyncError.unauthorized }
            guard (200..<300).contains(http.statusCode) else { throw WhoopCloudSyncError.rejected("Cloud ingest rejected (HTTP \(http.statusCode)).") }
            let envelope = try decoder.decode(Envelope.self, from: data)
            guard envelope.ok, let result = envelope.ingest else { throw WhoopCloudSyncError.rejected(envelope.error ?? "Cloud ingest rejected.") }
            accepted += result.accepted
            duplicates += result.duplicates
        }
        return WhoopCloudIngestResult(accepted: accepted, duplicates: duplicates, status: "complete")
    }

    private struct Envelope: Decodable {
        let ok: Bool
        let error: String?
        let ingest: WhoopCloudIngestResult?
    }
}

private struct AnyEncodable: Encodable {
    private let encodeValue: (Encoder) throws -> Void
    init<T: Encodable>(_ value: T) { self.encodeValue = value.encode(to:) }
    func encode(to encoder: Encoder) throws { try encodeValue(encoder) }
}

private extension Array {
    func chunked(into size: Int) -> [[Element]] {
        guard size > 0 else { return [self] }
        return stride(from: 0, to: count, by: size).map { start in
            Array(self[start..<Swift.min(start + size, count)])
        }
    }
}
