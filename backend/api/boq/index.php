<?php
/**
 * PhentiBuild - BOQ API
 *
 *   GET    /backend/api/boq/index.php                  List items (optional ?category=)
 *   GET    /backend/api/boq/index.php?id=BOQ-0001        Get a single item
 *   POST   /backend/api/boq/index.php                  Create an item
 *   PUT    /backend/api/boq/index.php?id=BOQ-0001        Update an item (partial)
 *   DELETE /backend/api/boq/index.php?id=BOQ-0001        Delete an item
 *
 * adjustedQuantity/total are always computed server-side (see
 * BoqItem::cast) from quantity/wastePercent/unitPrice, never stored, so
 * they can't drift from the frontend's own calculation of the same thing.
 */

require_once __DIR__ . '/../../core/bootstrap.php';
require_once __DIR__ . '/../../models/BoqItem.php';

phb_require_auth();

$boqItem = new BoqItem(getDbConnection());
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            handleGetOne($boqItem);
        } else {
            handleList($boqItem);
        }
        break;

    case 'POST':
        handleCreate($boqItem);
        break;

    case 'PUT':
    case 'PATCH':
        handleUpdate($boqItem);
        break;

    case 'DELETE':
        handleDelete($boqItem);
        break;

    default:
        Response::methodNotAllowed(['GET', 'POST', 'PUT', 'DELETE']);
}

function handleList(BoqItem $boqItem): never
{
    $filters = [];
    if (!empty($_GET['category'])) {
        if (!in_array($_GET['category'], BoqItem::validCategories(), true)) {
            Response::error('Invalid category filter.', 400);
        }
        $filters['category'] = $_GET['category'];
    }

    $rows = $boqItem->all($filters);
    Response::success($rows, 200, ['count' => count($rows)]);
}

function handleGetOne(BoqItem $boqItem): never
{
    $id = phb_required_string_param();
    $row = $boqItem->find($id);

    if ($row === null) {
        Response::notFound("BOQ item $id was not found.");
    }

    Response::success($row);
}

function handleCreate(BoqItem $boqItem): never
{
    $input = phb_json_input();
    $v = new Validator($input);

    $v->required('item', 'Item')->maxLength('item', 255, 'Item');
    $v->required('category', 'Category')->in('category', BoqItem::validCategories(), 'Category');
    $v->required('unit', 'Unit')->maxLength('unit', 100, 'Unit');
    $v->required('quantity', 'Quantity')->numeric('quantity', 'Quantity', 0);
    $v->optional('wastePercent')->numeric('wastePercent', 'Waste %', 0);
    $v->optional('unitPrice')->numeric('unitPrice', 'Unit price', 0);
    $v->optional('description')->maxLength('description', 2000, 'Description');
    $v->optional('specification')->maxLength('specification', 255, 'Specification');
    $v->optional('notes')->maxLength('notes', 2000, 'Notes');
    $v->optional('source')->maxLength('source', 20, 'Source');

    if ($v->fails()) {
        Response::validationFailed($v->errors());
    }

    $created = $boqItem->create($v->validated());
    Response::created($created);
}

function handleUpdate(BoqItem $boqItem): never
{
    $id = phb_required_string_param();
    $input = phb_json_input();
    $v = new Validator($input);

    $v->optional('item')->maxLength('item', 255, 'Item');
    $v->optional('category')->in('category', BoqItem::validCategories(), 'Category');
    $v->optional('unit')->maxLength('unit', 100, 'Unit');
    $v->optional('quantity')->numeric('quantity', 'Quantity', 0);
    $v->optional('wastePercent')->numeric('wastePercent', 'Waste %', 0);
    $v->optional('unitPrice')->numeric('unitPrice', 'Unit price', 0);
    $v->optional('description')->maxLength('description', 2000, 'Description');
    $v->optional('specification')->maxLength('specification', 255, 'Specification');
    $v->optional('notes')->maxLength('notes', 2000, 'Notes');

    if ($v->fails()) {
        Response::validationFailed($v->errors());
    }

    $validated = $v->validated();
    if (empty($validated)) {
        Response::error('At least one field must be provided to update.', 400);
    }

    $updated = $boqItem->update($id, $validated);
    if ($updated === null) {
        Response::notFound("BOQ item $id was not found.");
    }

    Response::success($updated);
}

function handleDelete(BoqItem $boqItem): never
{
    $id = phb_required_string_param();

    if ($boqItem->find($id) === null) {
        Response::notFound("BOQ item $id was not found.");
    }

    $boqItem->delete($id);
    Response::success(['id' => $id, 'deleted' => true]);
}
