<?php
/**
 * PhentiBuild - Contact Message Model
 *
 * Stores public Contact page submissions. Deliberately standalone from
 * History (see backend/models/History.php) — that audit trail is for
 * actions inside the authenticated app; a message from an anonymous site
 * visitor has no user_id and isn't a change to anyone's project data.
 *
 * all()/updateStatus() exist so an admin contact-management screen can be
 * added later (view / mark read / mark replied / archive) without
 * changing this model — no such screen exists yet, since there is no
 * admin dashboard in this app to host it.
 */
final class ContactMessage
{
    private PDO $db;

    public const STATUSES = ['new', 'read', 'replied', 'archived'];

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function create(array $data): array
    {
        $stmt = $this->db->prepare(
            'INSERT INTO contact_messages (name, email, phone, subject, message)
             VALUES (:name, :email, :phone, :subject, :message)'
        );
        $stmt->execute([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'subject' => $data['subject'],
            'message' => $data['message'],
        ]);

        return $this->find((int) $this->db->lastInsertId());
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM contact_messages WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ? self::cast($row) : null;
    }

    /** @param array{status?:string} $filters */
    public function all(array $filters = [], int $limit = 200): array
    {
        $sql = 'SELECT * FROM contact_messages WHERE 1=1';
        $params = [];

        if (!empty($filters['status'])) {
            $sql .= ' AND status = :status';
            $params['status'] = $filters['status'];
        }

        $sql .= ' ORDER BY created_at DESC LIMIT ' . max(1, min(500, $limit));

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return array_map([self::class, 'cast'], $stmt->fetchAll());
    }

    public function updateStatus(int $id, string $status): ?array
    {
        if (!in_array($status, self::STATUSES, true) || $this->find($id) === null) {
            return null;
        }

        $stmt = $this->db->prepare('UPDATE contact_messages SET status = :status WHERE id = :id');
        $stmt->execute(['status' => $status, 'id' => $id]);

        return $this->find($id);
    }

    private static function cast(array $row): array
    {
        $row['id'] = (int) $row['id'];
        return $row;
    }
}
