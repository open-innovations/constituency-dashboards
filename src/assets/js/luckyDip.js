function getRandomElementFromArray(array) {
    return array[Math.floor(Math.random() * array.length)];
}
function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
document.addEventListener("DOMContentLoaded", function randomConstituency() {
    // var link, lucky;
    const link = document.getElementById('lucky');
    link.setAttribute("href", '')
    var url = '';
    const letters = ['E', 'N', 'S', 'W'];
    const sNumbers = [14000021, 14000027, 14000045, 14000048, 14000051, 14000060, 14000111];
    const randLetter = getRandomElementFromArray(letters);
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