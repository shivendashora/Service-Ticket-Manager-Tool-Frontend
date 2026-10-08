import { useCallback, useEffect, useMemo, useState } from 'react';
import { usersApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

// /users is admin-only; for agents we only know about ourselves and assignees on tickets
export const useUsers = () => {
  const { user, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(isAdmin);

  const reload = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      setUsers(await usersApi.list());
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    reload();
  }, [reload]);

  const byId = useMemo(() => {
    const map = new Map(users.map((u) => [u.id, u]));
    if (user) map.set(user.id, user);
    return map;
  }, [users, user]);

  const nameOf = useCallback(
    (id) => {
      if (id === null || id === undefined) return '—';
      if (id === user?.id) return `${user.name} (you)`;
      return byId.get(id)?.name ?? `User #${id}`;
    },
    [byId, user]
  );

  return { users, byId, nameOf, loading, reload, setUsers };
};
