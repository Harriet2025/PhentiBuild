<?php
/**
 * PhentiBuild - Material Model
 *
 * All SQL for the materials table lives here, behind prepared statements
 * only. `id` is the natural MAT-#### string key (no separate numeric
 * surrogate needed, unlike Project's id/ref split) — safe to reuse as a
 * scan-based next-id source because "delete" here is a soft deactivate,
 * never a row removal, so an id is never freed up for reuse.
 */
require_once __DIR__ . '/History.php';

final class Material
{
    private PDO $db;

    private const CATEGORIES = ['Cement', 'Sand', 'Aggregate', 'Blocks', 'Rebar', 'Timber', 'Roofing', 'Underlay'];

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public static function validCategories(): array
    {
        return self::CATEGORIES;
    }

    /**
     * @param array{category?:string,includeInactive?:bool} $filters
     */
    public function all(array $filters = []): array
    {
        $sql = 'SELECT * FROM materials WHERE 1=1';
        $params = [];

        if (empty($filters['includeInactive'])) {
            $sql .= ' AND is_active = 1';
        }
        if (!empty($filters['category'])) {
            $sql .= ' AND category = :category';
            $params['category'] = $filters['category'];
        }

        $sql .= ' ORDER BY category, name';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return array_map([self::class, 'cast'], $stmt->fetchAll());
    }

    public function find(string $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM materials WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ? self::cast($row) : null;
    }

    private function nextId(): string
    {
        $stmt = $this->db->query("SELECT id FROM materials WHERE id REGEXP '^MAT-[0-9]+$' ORDER BY CAST(SUBSTRING(id, 5) AS UNSIGNED) DESC LIMIT 1");
        $last = $stmt->fetchColumn();
        $next = $last ? ((int) substr($last, 4)) + 1 : 1001;
        return 'MAT-' . $next;
    }

    /**
     * @param array $data Already validated by Validator — see api/materials/index.php.
     */
    public function create(array $data): array
    {
        $id = $this->nextId();

        $stmt = $this->db->prepare(
            'INSERT INTO materials (id, name, category, unit, dimensions, overall_dimensions, effective_coverage, standard_length, spacing, description, is_active)
             VALUES (:id, :name, :category, :unit, :dimensions, :overall_dimensions, :effective_coverage, :standard_length, :spacing, :description, 1)'
        );
        $stmt->execute([
            'id' => $id,
            'name' => $data['name'],
            'category' => $data['category'],
            'unit' => $data['unit'],
            'dimensions' => $data['dimensions'] ?? null,
            'overall_dimensions' => $data['overallDimensions'] ?? null,
            'effective_coverage' => $data['effectiveCoverage'] ?? null,
            'standard_length' => $data['standardLength'] ?? null,
            'spacing' => $data['spacing'] ?? null,
            'description' => $data['description'] ?? '',
        ]);

        History::record($this->db, 'material', $id, 'created', "Material $id (\"{$data['name']}\") was created.");

        return $this->find($id);
    }

    /**
     * Partial update — only the keys present in $data are changed.
     */
    public function update(string $id, array $data): ?array
    {
        if ($this->find($id) === null) {
            return null;
        }

        $columnMap = [
            'name' => 'name',
            'category' => 'category',
            'unit' => 'unit',
            'dimensions' => 'dimensions',
            'overallDimensions' => 'overall_dimensions',
            'effectiveCoverage' => 'effective_coverage',
            'standardLength' => 'standard_length',
            'spacing' => 'spacing',
            'description' => 'description',
        ];

        $sets = [];
        $params = ['id' => $id];
        foreach ($columnMap as $field => $column) {
            if (array_key_exists($field, $data)) {
                $sets[] = "$column = :$column";
                $params[$column] = $data[$field];
            }
        }

        if (empty($sets)) {
            return $this->find($id);
        }

        $sql = 'UPDATE materials SET ' . implode(', ', $sets) . ' WHERE id = :id';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        History::record($this->db, 'material', $id, 'updated', "Material $id was updated (" . implode(', ', array_keys($data)) . ').', $data);

        return $this->find($id);
    }

    /** Soft delete: marks the material inactive rather than removing the
     *  row, since past BOQ line items may still reference this id. */
    public function deactivate(string $id): ?array
    {
        if ($this->find($id) === null) {
            return null;
        }

        $stmt = $this->db->prepare('UPDATE materials SET is_active = 0 WHERE id = :id');
        $stmt->execute(['id' => $id]);

        History::record($this->db, 'material', $id, 'deactivated', "Material $id was deactivated.");

        return $this->find($id);
    }

    public function reactivate(string $id): ?array
    {
        if ($this->find($id) === null) {
            return null;
        }

        $stmt = $this->db->prepare('UPDATE materials SET is_active = 1 WHERE id = :id');
        $stmt->execute(['id' => $id]);

        History::record($this->db, 'material', $id, 'reactivated', "Material $id was reactivated.");

        return $this->find($id);
    }

    private static function cast(array $row): array
    {
        $row['is_active'] = (bool) $row['is_active'];
        return $row;
    }
}
