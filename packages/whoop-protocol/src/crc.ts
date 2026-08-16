export function crc8(bytes: Uint8Array, polynomial = 0x07): number { let crc = 0; for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc & 0x80) ? ((crc << 1) ^ polynomial) & 0xff : (crc << 1) & 0xff; } return crc; }

