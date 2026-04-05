export interface User {
    id: string;
    full_name: string;
    role_custom?: string;
    permissoes_customizadas?: Record<string, boolean>;
    [key: string]: any;
}

export interface SessionPayload {
    user: User;
    createdAt: number;
}

class SessionManager {
    static SESSION_KEY = "internalUser";

    static getUser(): User | null {
        try {
            const data = localStorage.getItem(this.SESSION_KEY);
            if (!data) return null;

            const payload = JSON.parse(data);

            // Se for o payload novo (com user e createdAt)
            if (payload && payload.user && payload.createdAt) {
                const maxAge = 1000 * 60 * 60 * 8; // 8h
                if (Date.now() - payload.createdAt > maxAge) {
                    this.clear();
                    return null;
                }
                return payload.user as User;
            }

            // Se for o dado antigo/direto (apenas o objeto user)
            return payload as User;
        } catch (err) {
            console.error("Erro no SessionManager.getUser:", err);
            return null;
        }
    }

    static setUser(user: User): void {
        const payload: SessionPayload = {
            user,
            createdAt: Date.now()
        };
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(payload));
        // Sincroniza token também como legado/compatibilidade se necessário
        localStorage.setItem('internal_token', 'authenticated');
    }

    static clear(): void {
        localStorage.removeItem(this.SESSION_KEY);
        localStorage.removeItem('internal_token');
        localStorage.removeItem('setorAtivo');
        localStorage.removeItem('session_version');
        sessionStorage.clear();
    }

    static getVersion(): string | null {
        return localStorage.getItem('session_version');
    }

    static setVersion(version: string): void {
        localStorage.setItem('session_version', version);
    }

    static isAuthenticated(): boolean {
        return !!this.getUser();
    }
}

export default SessionManager;
