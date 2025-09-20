import bcrypt from 'bcrypt';
import { Request, Response, NextFunction } from 'express';

// Usuários administrativos (em produção, isso deveria vir do banco de dados)
const ADMIN_USERS = [
  {
    id: '1',
    username: 'admin',
    password: '$2b$10$d39nUSCbHYp8JKip35fM6eKe0qDsJl6KLafjBrqxes5mElKyghh8C', // "admin123"
    role: 'admin'
  },
  {
    id: '2', 
    username: 'organizador',
    password: '$2b$10$KqkbN8o8tSY9kLmmD/1TgOxamP.hLW3VYS4gOSB37eIpXpWp19cCq', // "org2024"
    role: 'organizer'
  }
];

export async function createDefaultPasswords() {
  // Em desenvolvimento, criaremos senhas padrão hasheadas
  const adminHash = await bcrypt.hash('admin123', 10);
  const orgHash = await bcrypt.hash('org2024', 10);
  
  console.log('🔐 Credenciais administrativas:');
  console.log('👤 admin / admin123');
  console.log('👤 organizador / org2024');
  console.log('');
}

export async function authenticateUser(username: string, password: string) {
  const user = ADMIN_USERS.find(u => u.username === username);
  if (!user) return null;

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return null;

  return {
    id: user.id,
    username: user.username,
    role: user.role
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: 'Acesso negado. Login necessário.' });
  }
  next();
}