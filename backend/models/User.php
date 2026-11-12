<?php
/**
 * PhentiBuild - User Model
 *
 * Passwords are never handled as plain text beyond the single moment
 * they're hashed (create) or verified (login) — the raw password is
 * never written to a column, a log line, or a history entry, and
 * password_hash()/password_verify() are the only functions that ever
 * touch it. password_verify() is constant-time, so login timing can't be
 * used to distinguish "wrong password" from "right password" character
 * by character.
 */
final class User
{
    private PDO $db;

    private const ROLES = ['Admin', 'Contractor', 'Site Manager', 'Quantity Surveyor', 'Draftsman', 'User'];

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public static function validRoles(): array
    {
        return self::ROLES;
    }

    public function findByEmail(string $email): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM users WHERE email = :email LIMIT 1');
        $stmt->execute(['email' => $email]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM users WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function emailExists(string $email): bool
    {
        return $this->findByEmail($email) !== null;
    }

    /** True if `$email` belongs to a DIFFERENT user than `$excludeId` —
     *  used when a user edits their own profile so their own unchanged
     *  email doesn't trip the uniqueness check. */
    public function emailTakenByAnother(string $email, int $excludeId): bool
    {
        $existing = $this->findByEmail($email);
        return $existing !== null && (int) $existing['id'] !== $excludeId;
    }

    /**
     * Updates the editable profile fields (name/email/phone/role) for an
     * existing user. Only the keys present in $data are changed.
     */
    public function update(int $id, array $data): array
    {
        $sets = [];
        $params = ['id' => $id];

        foreach (['name', 'email', 'phone', 'role'] as $field) {
            if (array_key_exists($field, $data)) {
                $sets[] = "$field = :$field";
                $params[$field] = $field === 'email' ? strtolower($data[$field]) : $data[$field];
            }
        }

        if (!empty($sets)) {
            $sql = 'UPDATE users SET ' . implode(', ', $sets) . ' WHERE id = :id';
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
        }

        return self::sanitize($this->findById($id));
    }

    /**
     * Verifies $currentPassword against the stored hash, then sets
     * $newPassword if it matches. Returns false (no change made) when
     * the current password is wrong or the account doesn't exist.
     */
    public function changePassword(int $id, string $currentPassword, string $newPassword): bool
    {
        $user = $this->findById($id);
        if ($user === null || !password_verify($currentPassword, $user['password_hash'])) {
            return false;
        }

        $stmt = $this->db->prepare('UPDATE users SET password_hash = :password_hash WHERE id = :id');
        $stmt->execute([
            'password_hash' => password_hash($newPassword, PASSWORD_DEFAULT),
            'id' => $id,
        ]);
        return true;
    }

    /**
     * @param array $data Already validated by Validator — see api/auth/register.php.
     */
    public function create(array $data): array
    {
        $stmt = $this->db->prepare(
            'INSERT INTO users (name, email, phone, password_hash, role)
             VALUES (:name, :email, :phone, :password_hash, :role)'
        );
        $stmt->execute([
            'name' => $data['name'],
            'email' => strtolower($data['email']),
            'phone' => $data['phone'],
            'password_hash' => password_hash($data['password'], PASSWORD_DEFAULT),
            'role' => $data['role'] ?? 'User',
        ]);

        return self::sanitize($this->findById((int) $this->db->lastInsertId()));
    }

    /**
     * Verifies credentials for login. Returns the user (without the
     * password hash) on success, or null on any failure — a wrong
     * password and a non-existent email are indistinguishable to the
     * caller on purpose, so a login form never leaks which one was wrong.
     */
    public function verifyCredentials(string $email, string $password): ?array
    {
        $user = $this->findByEmail($email);
        if ($user === null) {
            // Still run password_verify against a dummy hash so a
            // nonexistent-email request takes about as long as a
            // wrong-password one — a basic timing-based enumeration guard.
            password_verify($password, '$2y$10$abcdefghijklmnopqrstuuJ8x9nF1z8m1e6i5r6c8e8f2g4h6i8k0lO');
            return null;
        }

        if (!password_verify($password, $user['password_hash'])) {
            return null;
        }

        return self::sanitize($user);
    }

    /** Strips the password hash before any user row leaves this model —
     *  it must never reach a JSON response or a session array. */
    private static function sanitize(?array $user): ?array
    {
        if ($user === null) {
            return null;
        }
        unset($user['password_hash']);
        $user['id'] = (int) $user['id'];
        return $user;
    }
}
