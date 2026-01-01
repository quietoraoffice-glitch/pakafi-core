const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

export interface LoginResponse {
  user: {
    id: number;
    email: string;
    name?: string;
    role: string;
  };
  token: string;
}

export interface OwnerUser {
  id: number;
  email: string;
  name?: string;
  role: string;
}

export async function apiLogin(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Login failed: ${res.status} ${text}`);
  }

  return res.json();
}

export async function apiWhoAmI(token: string) {
  const res = await fetch(`${API_BASE_URL}/auth/whoami`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`whoami failed: ${res.status}`);
  }

  return res.json();
}

export async function apiOwnerSystemInfo(token: string) {
  const res = await fetch(`${API_BASE_URL}/auth/owner/system-info`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`system-info failed: ${res.status}`);
  }

  return res.json();
}

export async function apiOwnerUsers(token: string): Promise<OwnerUser[]> {
  const res = await fetch(`${API_BASE_URL}/auth/owner/users`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`owner users failed: ${res.status}`);
  }

  return res.json();
}

// 🔼 Changer le rôle d’un user (USER / ADMIN / OWNER)
export async function apiOwnerUpdateUserRole(
  token: string,
  id: number,
  role: 'USER' | 'ADMIN' | 'OWNER',
): Promise<OwnerUser> {
  const res = await fetch(
    `${API_BASE_URL}/auth/owner/users/${id}/role`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `update role failed: ${res.status} ${text}`,
    );
  }

  const data = await res.json();
  return data.user as OwnerUser;
}

// 🗑️ Supprimer un utilisateur
export async function apiOwnerDeleteUser(
  token: string,
  id: number,
): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/auth/owner/users/${id}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `delete user failed: ${res.status} ${text}`,
    );
  }
}
