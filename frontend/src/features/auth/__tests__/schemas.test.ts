import { loginSchema, registerSchema } from '../schemas';

describe('loginSchema', () => {
  it('accepts a valid email identifier', () => {
    const result = loginSchema.safeParse({ identifier: 'user@example.com', password: 'secret' });
    expect(result.success).toBe(true);
  });

  it('accepts a non-email username identifier', () => {
    const result = loginSchema.safeParse({ identifier: 'my_username', password: 'secret' });
    expect(result.success).toBe(true);
  });

  it('rejects an identifier that looks like an email but is malformed', () => {
    const result = loginSchema.safeParse({ identifier: 'not-an-email@', password: 'secret' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        'Ingresa un correo válido o tu nombre de usuario',
      );
    }
  });

  it('rejects an empty identifier', () => {
    const result = loginSchema.safeParse({ identifier: '', password: 'secret' });
    expect(result.success).toBe(false);
  });

  it('rejects an empty password', () => {
    const result = loginSchema.safeParse({ identifier: 'user@example.com', password: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('La contraseña es obligatoria');
    }
  });
});

describe('registerSchema', () => {
  const base = {
    firstName: 'Tomas',
    lastName: 'Posada',
    username: 'tomasp',
    email: 'tomas@example.com',
    password: 'longenough1',
    confirmPassword: 'longenough1',
  };

  it('accepts fully valid registration data', () => {
    expect(registerSchema.safeParse(base).success).toBe(true);
  });

  it('rejects a first name that is too short', () => {
    const result = registerSchema.safeParse({ ...base, firstName: 'T' });
    expect(result.success).toBe(false);
  });

  it('rejects a last name that is too short', () => {
    const result = registerSchema.safeParse({ ...base, lastName: 'P' });
    expect(result.success).toBe(false);
  });

  it('rejects a username containing @', () => {
    const result = registerSchema.safeParse({ ...base, username: 'tomas@p' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message === 'El usuario no puede contener @')).toBe(
        true,
      );
    }
  });

  it('rejects an invalid email', () => {
    const result = registerSchema.safeParse({ ...base, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects a password shorter than 10 characters', () => {
    const result = registerSchema.safeParse({
      ...base,
      password: 'short1',
      confirmPassword: 'short1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects mismatched password confirmation', () => {
    const result = registerSchema.safeParse({ ...base, confirmPassword: 'somethingElse1' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('confirmPassword'));
      expect(issue?.message).toBe('Las contraseñas no coinciden');
    }
  });
});
