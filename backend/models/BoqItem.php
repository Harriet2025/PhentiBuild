<?php
/**
 * PhentiBuild - BOQ Item Model
 *
 * All SQL for the boq_items table lives here. `id` (BOQ-####) is derived
 * from the row's own `seq` (a plain AUTO_INCREMENT that's never reused)
 * right after insert — the same two-step approach used for
 * Project::create(), needed here because BOQ items really are deleted
 * (not soft-deactivated), so a MAX(id)-style scan could hand out a
 * freed id to an unrelated later item.
 *
 * Total is intentionally not stored: adjustedQuantity and total are
 * always derived from quantity/wastePercent/unitPrice, exactly like the
 * frontend's boq.js — computing them here too would create a second
 * source of truth that could drift out of sync.
 */
require_once __DIR__ . '/History.php';

final class BoqItem
{
    private PDO $db;

    private const CATEGORIES = ['Cement', 'Sand', 'Aggregate', 'Blocks', 'Rebar', 'Timber', 'Roofing', 'Underlay', 'Other'];

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public static function validCategories(): array
    {
        return self::CATEGORIES;
    }

    public function all(array $filters = []): array
    {
        $sql = 'SELECT * FROM boq_items WHERE 1=1';
        $params = [];

        if (!empty($filters['category'])) {
            $sql .= ' AND category = :category';
            $params['category'] = $filters['category'];
        }

        $sql .= ' ORDER BY category, item';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return array_map([self::class, 'cast'], $stmt->fetchAll());
    }

    public function find(string $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM boq_items WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ? self::cast($row) : null;
    }

    public function create(array $data): array
    {
        $stmt = $this->db->prepare(
            'INSERT INTO boq_items (id, item, category, description, specification, unit, quantity, waste_percent, unit_price, notes, source)
             VALUES (NULL, :item, :category, :description, :specification, :unit, :quantity, :waste_percent, :unit_price, :notes, :source)'
        );
        $stmt->execute([
            'item' => $data['item'],
            'category' => $data['category'],
            'description' => $data['description'] ?? '',
            'specification' => $data['specification'] ?? null,
            'unit' => $data['unit'],
            'quantity' => $data['quantity'] ?? 0,
            'waste_percent' => $data['wastePercent'] ?? 0,
            'unit_price' => $data['unitPrice'] ?? 0,
            'notes' => $data['notes'] ?? null,
            'source' => $data['source'] ?? 'manual',
        ]);

        $seq = (int) $this->db->lastInsertId();
        $id = 'BOQ-' . str_pad((string) $seq, 4, '0', STR_PAD_LEFT);

        $update = $this->db->prepare('UPDATE boq_items SET id = :id WHERE seq = :seq');
        $update->execute(['id' => $id, 'seq' => $seq]);

        History::record($this->db, 'boq_item', $id, 'created', "BOQ item $id (\"{$data['item']}\") was created.");

        return $this->find($id);
    }

    public function update(string $id, array $data): ?array
    {
        if ($this->find($id) === null) {
            return null;
        }

        $columnMap = [
            'item' => 'item', 'category' => 'category', 'description' => 'description',
            'specification' => 'specification', 'unit' => 'unit', 'quantity' => 'quantity',
            'wastePercent' => 'waste_percent', 'unitPrice' => 'unit_price', 'notes' => 'notes',
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

        $sql = 'UPDATE boq_items SET ' . implode(', ', $sets) . ' WHERE id = :id';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        History::record($this->db, 'boq_item', $id, 'updated', "BOQ item $id was updated (" . implode(', ', array_keys($data)) . ').', $data);

        return $this->find($id);
    }

    public function delete(string $id): bool
    {
        $existing = $this->find($id);
        $stmt = $this->db->prepare('DELETE FROM boq_items WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $deleted = $stmt->rowCount() > 0;

        if ($deleted && $existing !== null) {
            History::record($this->db, 'boq_item', $id, 'deleted', 'BOQ item ' . $id . ' ("' . $existing['item'] . '") was deleted.');
        }

        return $deleted;
    }

    private static function cast(array $row): array
    {
        unset($row['seq']);
        $row['quantity'] = (float) $row['quantity'];
        $row['waste_percent'] = (float) $row['waste_percent'];
        $row['unit_price'] = (float) $row['unit_price'];
        $row['adjusted_quantity'] = round($row['quantity'] * (1 + $row['waste_percent'] / 100), 4);
        $row['total'] = round($row['adjusted_quantity'] * $row['unit_price'], 2);
        return $row;
    }
}
