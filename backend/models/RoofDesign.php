<?php
/**
 * PhentiBuild - Roof Design Model
 *
 * Unlike every other resource connected so far, this is a genuine
 * single-document store, not a collection — it mirrors
 * roof-studio-store.js exactly, which has always managed one current
 * drawing (shapes + properties), never a list of saved designs. This
 * model always operates on the one row (the earliest one, if more than
 * one somehow exists), auto-creating a blank default the first time it's
 * asked for so a fresh install never 404s before anything is drawn.
 */
require_once __DIR__ . '/History.php';

final class RoofDesign
{
    private PDO $db;

    private const DEFAULT_PROPERTIES = [
        'roofType' => 'Gable Roof', 'length' => '', 'width' => '', 'pitch' => '',
        'rafterSpacing' => '', 'purlinSpacing' => '', 'roofingMaterial' => '',
    ];

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    /** Returns the single design row, creating a blank default one on
     *  first use. */
    public function getCurrent(): array
    {
        $row = $this->db->query('SELECT * FROM roof_designs ORDER BY id ASC LIMIT 1')->fetch();

        if ($row === false) {
            $stmt = $this->db->prepare(
                'INSERT INTO roof_designs (shapes_json, properties_json) VALUES (:shapes, :properties)'
            );
            $stmt->execute([
                'shapes' => json_encode([]),
                'properties' => json_encode(self::DEFAULT_PROPERTIES),
            ]);
            $id = (int) $this->db->lastInsertId();
            History::record($this->db, 'roof_design', (string) $id, 'created', 'A roof design was created.');
            return $this->getCurrent();
        }

        return self::cast($row);
    }

    /**
     * Upserts the single design. Only the keys present in $data are
     * changed (partial update), matching every other resource's PUT.
     */
    public function save(array $data): array
    {
        $current = $this->getCurrent();

        $shapes = array_key_exists('shapes', $data) ? $data['shapes'] : $current['shapes'];
        $properties = array_key_exists('properties', $data)
            ? array_merge($current['properties'], $data['properties'])
            : $current['properties'];

        $stmt = $this->db->prepare('UPDATE roof_designs SET shapes_json = :shapes, properties_json = :properties WHERE id = :id');
        $stmt->execute([
            'shapes' => json_encode($shapes, JSON_UNESCAPED_SLASHES),
            'properties' => json_encode($properties, JSON_UNESCAPED_SLASHES),
            'id' => $current['id'],
        ]);

        History::record($this->db, 'roof_design', (string) $current['id'], 'updated', 'Roof design was updated (' . implode(', ', array_keys($data)) . ').', $data);

        return $this->getCurrent();
    }

    /** Resets the design back to a blank drawing with default properties
     *  — the closest sensible meaning "delete" has for a single document
     *  that must always exist (roof-studio-canvas.js always needs
     *  *something* to render, even if empty). */
    public function reset(): array
    {
        $current = $this->getCurrent();
        $stmt = $this->db->prepare('UPDATE roof_designs SET shapes_json = :shapes, properties_json = :properties WHERE id = :id');
        $stmt->execute([
            'shapes' => json_encode([]),
            'properties' => json_encode(self::DEFAULT_PROPERTIES),
            'id' => $current['id'],
        ]);
        History::record($this->db, 'roof_design', (string) $current['id'], 'deleted', 'Roof design was reset to blank.');
        return $this->getCurrent();
    }

    private static function cast(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'shapes' => json_decode($row['shapes_json'], true) ?? [],
            'properties' => array_merge(self::DEFAULT_PROPERTIES, json_decode($row['properties_json'], true) ?? []),
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at'],
        ];
    }
}
