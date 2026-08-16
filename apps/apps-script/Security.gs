function assertAuthorized_() { if (!Session.getActiveUser().getEmail()) throw new Error('AUTH_REQUIRED'); }

