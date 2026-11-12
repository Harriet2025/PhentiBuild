<?php
/**
 * PhentiBuild - Calculation Model
 *
 * A saved {input, result} pair from one of the calculator modules
 * (masonry/plaster/concrete/rebar/timber/roofing-calcs.js). Both are stored as
 * JSON since their shape differs per calculator type — mirrors exactly
 * what manual-input.js already builds in memory as `lastCalculation`.
 */
require_once __DIR__ . '/History.php';

final class Calculation
{
    private PDO $db;

    private const CALCULATION_TYPES = ['walls', 'plastering', 'concrete', 'rebar', 'timber', 'roofing'];

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public static function validCalculationTypes(): array
    {
        return self::CALCULATION_TYPES;
    }

    public function all(array $filters = []): array
    {
        $sql = 'SELECT * FROM calculations WHERE 1=1';
        $params = [];

        if (!empty($filters['calculationType'])) {
            $sql .= ' AND calculation_type = :calculation_type';
            $params['calculation_type'] = $filters['calculationType'];
        }

        $sql .= ' ORDER BY created_at DESC';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return array_map([self::class, 'cast'], $stmt->fetchAll());
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM calculations WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ? self::cast($row) : null;
    }

    public function create(array $data): array
    {
        $stmt = $this->db->prepare(
            'INSERT INTO calculations (calculation_type, label, input_json, result_json, notes)
             VALUES (:calculation_type, :label, :input_json, :result_json, :notes)'
        );
        $stmt->execute([
            'calculation_type' => $data['calculationType'],
            'label' => $data['label'] ?? null,
            'input_json' => json_encode($data['input'], JSON_UNESCAPED_SLASHES),
            'result_json' => json_encode($data['result'], JSON_UNESCAPED_SLASHES),
            'notes' => $data['notes'] ?? null,
        ]);

        $id = (int) $this->db->lastInsertId();
        History::record($this->db, 'calculation', (string) $id, 'created', 'Calculation #' . $id . ' (' . $data['calculationType'] . ') was saved.');

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

        if (empty($sets)) {
            return $this->find($id);
        }

        $sql = 'UPDATE calculations SET ' . implode(', ', $sets) . ' WHERE id = :id';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        History::record($this->db, 'calculation', (string) $id, 'updated', 'Calculation #' . $id . ' was updated.', $data);

        return $this->find($id);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->db->prepare('DELETE FROM calculations WHERE id = :id');
        $stmt->execute(['id' => $id]);
        if ($stmt->rowCount() > 0) {
            History::record($this->db, 'calculation', (string) $id, 'deleted', 'Calculation #' . $id . ' was deleted.');
        }
        return $stmt->rowCount() > 0;
    }

    private static function cast(array $row): array
    {
        $row['id'] = (int) $row['id'];
        $row['input'] = json_decode($row['input_json'], true) ?? [];
        $row['result'] = json_decode($row['result_json'], true) ?? [];
        unset($row['input_json'], $row['result_json']);
        return $row;
    }
}
