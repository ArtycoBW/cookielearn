UPDATE certificates
SET total_quantity = remaining_quantity
WHERE total_quantity IS NULL
  AND remaining_quantity IS NOT NULL;

UPDATE certificates
SET remaining_quantity = total_quantity
WHERE total_quantity IS NOT NULL
  AND remaining_quantity IS NULL;

ALTER TABLE certificates
DROP CONSTRAINT IF EXISTS certificates_quantity_consistency;

ALTER TABLE certificates
ADD CONSTRAINT certificates_quantity_consistency
CHECK (
  (total_quantity IS NULL AND remaining_quantity IS NULL)
  OR (
    total_quantity IS NOT NULL
    AND remaining_quantity IS NOT NULL
    AND total_quantity >= 0
    AND remaining_quantity >= 0
    AND remaining_quantity <= total_quantity
  )
);
