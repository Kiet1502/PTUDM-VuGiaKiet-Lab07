var express = require('express');
var router = express.Router();
let mongoose = require('mongoose');

let inventoryModel = require('../schemas/inventories');

function parsePositiveQuantity(value) {
  let quantity = Number(value);
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  return quantity;
}

function isValidProductId(productId) {
  return mongoose.Types.ObjectId.isValid(productId);
}

router.get('/', async function (req, res, next) {
  try {
    let data = await inventoryModel
      .find({})
      .populate({ path: 'product', select: 'title price category' });
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// Get inventory by inventory ID (join with product)
router.get('/:id', async function (req, res, next) {
  try {
    let result = await inventoryModel
      .findById(req.params.id)
      .populate({ path: 'product' });

    if (!result) {
      return res.status(404).send({ message: 'ID NOT FOUND' });
    }

    res.status(200).send(result);
  } catch (error) {
    res.status(404).send({ message: 'ID NOT FOUND' });
  }
});

// POST increase stock
// Body: { product, quantity }
router.post('/add_stock', async function (req, res, next) {
  try {
    let productId = req.body.product;
    let quantity = parsePositiveQuantity(req.body.quantity);

    if (!productId || !isValidProductId(productId) || quantity === null) {
      return res.status(400).send({ message: 'INVALID INPUT' });
    }

    let updated = await inventoryModel
      .findOneAndUpdate(
        { product: productId },
        { $inc: { stock: quantity } },
        { new: true }
      )
      .populate({ path: 'product' });

    if (!updated) {
      return res.status(404).send({ message: 'INVENTORY NOT FOUND' });
    }

    res.send(updated);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

// POST decrease stock
// Body: { product, quantity }
router.post('/remove_stock', async function (req, res, next) {
  try {
    let productId = req.body.product;
    let quantity = parsePositiveQuantity(req.body.quantity);

    if (!productId || !isValidProductId(productId) || quantity === null) {
      return res.status(400).send({ message: 'INVALID INPUT' });
    }

    let updated = await inventoryModel
      .findOneAndUpdate(
        { product: productId, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
        { new: true }
      )
      .populate({ path: 'product' });

    if (!updated) {
      let inv = await inventoryModel.findOne({ product: productId });
      if (!inv) return res.status(404).send({ message: 'INVENTORY NOT FOUND' });
      return res.status(400).send({ message: 'INSUFFICIENT STOCK' });
    }

    res.send(updated);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

// POST reservation
// Body: { product, quantity }
// Decrease stock and increase reserved accordingly
router.post('/reservation', async function (req, res, next) {
  try {
    let productId = req.body.product;
    let quantity = parsePositiveQuantity(req.body.quantity);

    if (!productId || !isValidProductId(productId) || quantity === null) {
      return res.status(400).send({ message: 'INVALID INPUT' });
    }

    let updated = await inventoryModel
      .findOneAndUpdate(
        { product: productId, stock: { $gte: quantity } },
        { $inc: { stock: -quantity, reserved: quantity } },
        { new: true }
      )
      .populate({ path: 'product' });

    if (!updated) {
      let inv = await inventoryModel.findOne({ product: productId });
      if (!inv) return res.status(404).send({ message: 'INVENTORY NOT FOUND' });
      return res.status(400).send({ message: 'INSUFFICIENT STOCK' });
    }

    res.send(updated);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

// POST sold
// Body: { product, quantity }
// Decrease reservation and increase soldCount accordingly
router.post('/sold', async function (req, res, next) {
  try {
    let productId = req.body.product;
    let quantity = parsePositiveQuantity(req.body.quantity);

    if (!productId || !isValidProductId(productId) || quantity === null) {
      return res.status(400).send({ message: 'INVALID INPUT' });
    }

    let updated = await inventoryModel
      .findOneAndUpdate(
        { product: productId, reserved: { $gte: quantity } },
        { $inc: { reserved: -quantity, soldCount: quantity } },
        { new: true }
      )
      .populate({ path: 'product' });

    if (!updated) {
      let inv = await inventoryModel.findOne({ product: productId });
      if (!inv) return res.status(404).send({ message: 'INVENTORY NOT FOUND' });
      return res.status(400).send({ message: 'INSUFFICIENT RESERVED' });
    }

    res.send(updated);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

module.exports = router;

