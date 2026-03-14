class SessionManager {
    static SESSION_KEY = "internalUser";

    static getUser() {
        try {
            const data = localStorage.getItem(this.SESSION_KEY);
            if (!data) return null;

            const payload = JSON.parse(data);
            const maxAge = 1000 * 60 * 60 * 8; // 8h

            if (Date.now() - payload.createdAt > maxAge) {
                this.clear();
                return null;
            }

            return payload.user;
        } catch (err) {
            console.error("Erro no SessionManager.getUser:", err);
            return null;
        }
    }

    static setUser(user) {
        const payload = {
            user,
            createdAt: Date.now()
        };
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(payload));
        // Sincroniza token também como legado/compatibilidade se necessário
        localStorage.setItem('internal_token', 'authenticated');
    }

    static clear() {
        localStorage.removeItem(this.SESSION_KEY);
        localStorage.removeItem('internal_token');
        localStorage.removeItem('setorAtivo');
        sessionStorage.clear();
    }

    static isAuthenticated() {
        return !!this.getUser();
    }
}

export default SessionManager;
