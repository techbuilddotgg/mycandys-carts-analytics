const mongoose = require('mongoose');

const statisticSchema = new mongoose.Schema({
    url: {
        type: String,
    },
    timestamp: {
        type: Date,
    }
});

const Statistic = mongoose.model('Statistic', statisticSchema);

module.exports = Statistic;
