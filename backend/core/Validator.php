<?php
/**
 * PhentiBuild - Input Validator
 *
 * A small rule-per-field validator, deliberately mirroring the hand-rolled
 * validation style already used throughout the frontend (see
 * frontend/js/modules/project-form.js): each field gets a plain-English
 * error message, collected into one map rather than failing fast on the
 * first bad field, so the API can report everything wrong with a request
 * at once (Response::validationFailed sends them all back together).
 *
 * Usage:
 *   $v = new Validator($input);
 *   $v->required('name', 'Project name')->minLength('name', 3);
 *   $v->required('type', 'Project type')->in('type', ['Residential', ...]);
 *   if ($v->fails()) { Response::validationFailed($v->errors()); }
 *   $clean = $v->validated(); // only the fields that were checked
 */
final class Validator
{
    private array $data;
    private array $errors = [];
    private array $touchedFields = [];

    public function __construct(array $data)
    {
        $this->data = $data;
    }

    private function value(string $field)
    {
        return $this->data[$field] ?? null;
    }

    private function has(string $field): bool
    {
        return array_key_exists($field, $this->data) && $this->data[$field] !== null && $this->data[$field] !== '';
    }

    private function fail(string $field, string $message): void
    {
        // First error per field wins — later rules on an already-failed
        // field are skipped so messages don't pile up confusingly.
        if (!isset($this->errors[$field])) {
            $this->errors[$field] = $message;
        }
    }

    private function shouldSkip(string $field): bool
    {
        return isset($this->errors[$field]);
    }

    public function required(string $field, string $label): self
    {
        $this->touchedFields[$field] = true;
        if (!$this->has($field)) {
            $this->fail($field, "$label is required.");
        }
        return $this;
    }

    /** Only applies subsequent rules when the field was actually sent —
     *  the basis for partial (PATCH-style) updates. */
    public function optional(string $field): self
    {
        $this->touchedFields[$field] = true;
        return $this;
    }

    public function string(string $field, string $label): self
    {
        if ($this->shouldSkip($field) || !$this->has($field)) {
            return $this;
        }
        if (!is_string($this->value($field))) {
            $this->fail($field, "$label must be text.");
        }
        return $this;
    }

    public function minLength(string $field, int $min, ?string $label = null): self
    {
        if ($this->shouldSkip($field) || !$this->has($field)) {
            return $this;
        }
        if (mb_strlen((string) $this->value($field)) < $min) {
            $this->fail($field, ($label ?? ucfirst($field)) . " must be at least $min characters.");
        }
        return $this;
    }

    public function maxLength(string $field, int $max, ?string $label = null): self
    {
        if ($this->shouldSkip($field) || !$this->has($field)) {
            return $this;
        }
        if (mb_strlen((string) $this->value($field)) > $max) {
            $this->fail($field, ($label ?? ucfirst($field)) . " must be $max characters or fewer.");
        }
        return $this;
    }

    /** @param string[] $allowed */
    public function in(string $field, array $allowed, ?string $label = null): self
    {
        if ($this->shouldSkip($field) || !$this->has($field)) {
            return $this;
        }
        if (!in_array($this->value($field), $allowed, true)) {
            $this->fail($field, ($label ?? ucfirst($field)) . ' must be one of: ' . implode(', ', $allowed) . '.');
        }
        return $this;
    }

    public function date(string $field, ?string $label = null): self
    {
        if ($this->shouldSkip($field) || !$this->has($field)) {
            return $this;
        }
        $value = (string) $this->value($field);
        $parsed = DateTime::createFromFormat('Y-m-d', $value);
        if (!$parsed || $parsed->format('Y-m-d') !== $value) {
            $this->fail($field, ($label ?? ucfirst($field)) . ' must be a valid date (YYYY-MM-DD).');
        }
        return $this;
    }

    /** Cross-field: end date must not be before start date. */
    public function dateNotBefore(string $field, string $otherField, ?string $label = null): self
    {
        if ($this->shouldSkip($field) || !$this->has($field) || !$this->has($otherField)) {
            return $this;
        }
        if (strtotime((string) $this->value($field)) < strtotime((string) $this->value($otherField))) {
            $this->fail($field, ($label ?? ucfirst($field)) . ' cannot be before the start date.');
        }
        return $this;
    }

    public function integerBetween(string $field, int $min, int $max, ?string $label = null): self
    {
        if ($this->shouldSkip($field) || !$this->has($field)) {
            return $this;
        }
        $value = $this->value($field);
        if (!is_numeric($value) || (int) $value != $value || $value < $min || $value > $max) {
            $this->fail($field, ($label ?? ucfirst($field)) . " must be a whole number between $min and $max.");
        }
        return $this;
    }

    /** A plain number (int or float), optionally floored at $min. Unlike
     *  integerBetween(), fractional values are fine — for quantities,
     *  prices and percentages, not counts. */
    public function numeric(string $field, ?string $label = null, ?float $min = null): self
    {
        if ($this->shouldSkip($field) || !$this->has($field)) {
            return $this;
        }
        $value = $this->value($field);
        if (!is_numeric($value)) {
            $this->fail($field, ($label ?? ucfirst($field)) . ' must be a number.');
            return $this;
        }
        if ($min !== null && (float) $value < $min) {
            $this->fail($field, ($label ?? ucfirst($field)) . " must be $min or more.");
        }
        return $this;
    }

    public function email(string $field, ?string $label = null): self
    {
        if ($this->shouldSkip($field) || !$this->has($field)) {
            return $this;
        }
        if (!filter_var((string) $this->value($field), FILTER_VALIDATE_EMAIL)) {
            $this->fail($field, ($label ?? ucfirst($field)) . ' must be a valid email address.');
        }
        return $this;
    }

    public function phone(string $field, ?string $label = null): self
    {
        if ($this->shouldSkip($field) || !$this->has($field)) {
            return $this;
        }
        $digits = preg_replace('/[\s\-().]/', '', (string) $this->value($field));
        if (!preg_match('/^\+?\d{7,15}$/', $digits)) {
            $this->fail($field, ($label ?? ucfirst($field)) . ' must be a valid phone number (7–15 digits).');
        }
        return $this;
    }

    /** Loose phone-or-email check, matching the frontend's own contact rule. */
    public function phoneOrEmail(string $field, ?string $label = null): self
    {
        if ($this->shouldSkip($field) || !$this->has($field)) {
            return $this;
        }
        $value = (string) $this->value($field);
        if (str_contains($value, '@')) {
            if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
                $this->fail($field, ($label ?? ucfirst($field)) . ' must be a valid email address.');
            }
            return $this;
        }
        $digits = preg_replace('/[\s\-().]/', '', $value);
        if (!preg_match('/^\+?\d{7,15}$/', $digits)) {
            $this->fail($field, ($label ?? ucfirst($field)) . ' must be a valid phone number or an email address.');
        }
        return $this;
    }

    public function fails(): bool
    {
        return !empty($this->errors);
    }

    public function errors(): array
    {
        return $this->errors;
    }

    /** Returns only the fields that were named in a rule (via required()
     *  or optional()) and were actually present, trimmed if they're
     *  strings — the safe, checked subset of the raw input. Anything the
     *  client sent that no rule ever asked about is dropped here, not
     *  silently passed through to a database write. */
    public function validated(): array
    {
        $out = [];
        foreach (array_keys($this->touchedFields) as $key) {
            if ($this->has($key)) {
                $value = $this->data[$key];
                $out[$key] = is_string($value) ? trim($value) : $value;
            }
        }
        return $out;
    }
}
