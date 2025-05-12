function getRandomElementFromArray(array) {
    return array[Math.floor(Math.random() * array.length)];
}
function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

function weightedRandom(items, weights) {
    if (items.length !== weights.length) {
        throw new Error('Items and weights must be of the same size');
    }

    if (!items.length) {
        throw new Error('Items must not be empty');
    }

    // Preparing the cumulative weights array.
    // For example:
    // - weights = [1, 4, 3]
    // - cumulativeWeights = [1, 5, 8]
    const cumulativeWeights = [];
    for (let i = 0; i < weights.length; i++) {
        cumulativeWeights[i] = weights[i] + (cumulativeWeights[i - 1] || 0);
    }

    // Getting the random number in a range of [0...sum(weights)]
    // For example:
    // - weights = [1, 4, 3]
    // - maxCumulativeWeight = 8
    // - range for the random number is [0...8]
    const maxCumulativeWeight = cumulativeWeights[cumulativeWeights.length - 1];
    const randomNumber = maxCumulativeWeight * Math.random();

    // Picking the random item based on its weight.
    // The items with higher weight will be picked more often.
    for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
        if (cumulativeWeights[itemIndex] >= randomNumber) {
        return items[itemIndex];
        }
    }
}

document.addEventListener("DOMContentLoaded", function randomConstituency() {
    // var link, lucky;
    const link = document.getElementById('lucky');
    var url = '';
    const letters = ['E', 'N', 'S', 'W'];
    const weights = [0.835, 0.028, 0.088, 0.049]
    const sNumbers = [14000021, 14000027, 14000045, 14000048, 14000051, 14000060, 14000111];
    const randLetter = weightedRandom(letters, weights);
    console.log(randLetter)
    if (randLetter == 'E') {
        randomNum = getRandomIntInclusive(1063, 1605);
        url = randLetter + "1400" + randomNum;
    } else if (randLetter == 'W') {
        randomNum = getRandomIntInclusive(7000081, 7000112);
        url = randLetter + '0' + randomNum;
    } else if (randLetter == 'N') {
        randomNum = getRandomIntInclusive(5000001, 5000018);
        url = randLetter + '0' + randomNum;
    } else if (randLetter == 'S') {
        const individualValues = sNumbers.slice(0, -2); // all except last two
        const lower = sNumbers[sNumbers.length - 2];
        const upper = sNumbers[sNumbers.length - 1];

        // Generate all values in the range [lower, upper]
        for (let i = lower; i <= upper; i++) {
            individualValues.push(i);
        }

        // Pick one at random
        const randomNum = getRandomElementFromArray(individualValues);
        url = randLetter + randomNum
    }
    link.setAttribute("href", url + '/')
    }
)