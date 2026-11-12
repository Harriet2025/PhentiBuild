<?php
/**
 * PhentiBuild - Measurement Model
 *
 * A saved snapshot of a Manual Input form's validated field values,
 * keyed by section_type (walls, plastering, slab, column, roof,
 * concrete, rebar, timber). The fields differ per type, so they're kept
 * as one JSON payload (values_json) rather than a fixed column set.
 */
require_once __DIR__ . '/History.php';

final class Measurement
{
    private PDO $db;

    private const SECTION_TYPES = ['walls', 'plastering', 'slab', 'column', 'roof', 'concrete', 'rebar', 'timber'];

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public static function validSectionTypes(): array
    {
        return self::SECTION_TYPES;
    }

    /**
     * @param array{sectionType?:string} $filters
     */
    public function all(array $filters = []): array
    {
        $sql = 'SELECT * FROM measurements WHERE 1=1';
        $params = [];

        if (!empty($filters['sectionType'])) {
            $sql .= ' AND section_type = :section_type';
            $params['section_type'] = $filters['sectionType'];
        }

        $sql .= ' ORDER BY created_at DESC';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return array_map([self::class, 'cast'], $stmt->fetchAll());
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM measurements WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ? self::cast($row) : null;
    }

    public function create(array $data): array
    {
        $stmt = $this->db->prepare(
            'INSERT INTO measurements (section_type, label, values_json, notes)
             VALUES (:section_type, :label, :values_json, :notes)'
        );
        $stmt->execute([
            'section_type' => $data['sectionType'],
            'label' => $data['label'] ?? null,
            'values_json' => json_encode($data['values'], JSON_UNESCAPED_SLASHES),
            'notes' => $data['notes'] ?? null,
        ]);

        $id = (int) $this->db->lastInsertId();
        History::record($this->db, 'measurement', (string) $id, 'created', 'Measurement #' . $id . ' (' . $data['sectionType'] . ') was saved.');

        return $this->find($id);
    }

    public function update(int $id, array $data): ?array
    {
        if ($this->find($id) === null) {
            return null;
        }

        $sets = [];
        $params = ['id' => $id];

        if (array_key_exists('label', $data)) {
            $sets[] = 'label = :label';
            $params['label'] = $data['label'];
        }
        if (array_key_exists('notes', $data)) {
            $sets[] = 'notes = :notes';
            $params['notes'] = $data['notes'];
        }
        if (array_key_exists('values', $data)) {
            $sets[] = 'values_json = :values_json';
            $params['values_json'] = json_encode($data['values'], JSON_UNESCAPED_SLASHES);
        }

        if (empty($sets)) {
            return $this->find($id);
        }

        $sql = 'UPDATE measurements SET ' . implode(', ', $sets) . ' WHERE id = :id';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        History::record($this->db, 'measurement', (string) $id, 'updated', 'Measurement #' . $id . ' was updated.', $data);

        return $this->find($id);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->db->prepare('DELETE FROM measurements WHERE id = :id');
        $stmt->execute(['id' => $id]);
        if ($stmt->rowCount() > 0) {
            History::record($this->db, 'measurement', (string) $id, 'deleted', 'Measurement #' . $id . ' was deleted.');
        }
        return $stmt->rowCount() > 0;
    }

    private static function cast(array $row): array
    {
        $row['id'] = (int) $row['id'];
        $row['values'] = json_decode($row['values_json'], true) ?? [];
        unset($row['values_json']);
        return $row;
    }
}
