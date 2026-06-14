const express = require('express');
const router = express.Router();
const { activeUser } = require('../controllers/activeController');
const { getAllAccounts } = require('../controllers/activeController');


router.get('/active/accounts', getAllAccounts);
router.post('/active/:id', activeUser);


module.exports = router;
