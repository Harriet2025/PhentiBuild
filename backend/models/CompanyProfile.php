<?php
/**
 * PhentiBuild - Company Profile Model
 *
 * A single-document store, same pattern as RoofDesign (see
 * backend/models/RoofDesign.php) — this app has no multi-tenancy, so
 * there is only ever one company profile. Always operates on the one
 * row (the earliest, if more than one somehow exists), auto-creating a
 * blank default the first time it's asked for.
 */
require_once __DIR__ . '/History.php';

final class CompanyProfile
{
    private PDO $db;

    private const FIELDS = ['companyName', 'address', 'phone', 'email', 'registrationNumber'];

    private const COLUMN_MAP = [
        'companyName' => 'company_name',
        'address' => 'address',
        'phone' => 'phone',
        'email' => 'email',
        'registrationNumber' => 'registration_number',
    ];

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public static function validFields(): array
    {
        return self::FIELDS;
    }

    public function getCurrent(): array
    {
        $row = $this->db->query('SELECT * FROM company_profile ORDER BY id ASC LIMIT 1')->fetch();

        if ($row === false) {
            $stmt = $this->db->prepare(
                'INSERT INTO company_profile (company_name, address, phone, email, registration_number)
                 VALUES (\'\', \'\', \'\', \'\', \'\')'
            );
            $stmt->execute();
            return $this->getCurrent();
        }

        return self::cast($row);
    }

    /** Partial update — only the keys present in $data are changed. */
    public function save(array $data): array
    {
        $current = $this->getCurrent();

        $sets = [];
        $params = ['id' => $current['id']];
        foreach (self::FIELDS as $field) {
            if (array_key_exists($field, $data)) {
                $column = self::COLUMN_MAP[$field];
                $sets[] = "$column = :$column";
                $params[$column] = (string) $data[$field];
            }
        }

        if (!empty($sets)) {
            $sql = 'UPDATE company_profile SET ' . implode(', ', $sets) . ' WHERE id = :id';
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);

            History::record($this->db, 'company_profile', (string) $current['id'], 'updated',
                'Company profile was updated (' . implode(', ', array_keys($data)) . ').', $data);
        }

        return $this->getCurrent();
    }

    private static function cast(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'companyName' => $row['company_name'],
            'address' => $row['address'],
            'phone' => $row['phone'],
            'email' => $row['email'],
            'registrationNumber' => $row['registration_number'],
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at'],
        ];
    }
}
