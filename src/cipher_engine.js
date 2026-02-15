export class CubeCipherEngine {
    constructor(cubeSimulator) {
        this.cube = cubeSimulator;
        this.movesList = ['U', "U'", 'R', "R'", 'F', "F'"];
        this.stepConstants = []; // Table of key-dependent round/step constants
    }

    setStepConstants(constants) {
        this.stepConstants = constants;
    }

    /**
     * Generates a deterministic sequence of constants derived from the secret key.
     * Similar to a Key Expansion / S-Box generation.
     */
    static generateStepConstants(seedKey, length = 512) {
        let seedNum = 0;
        for (let i = 0; i < seedKey.length; i++) seedNum += seedKey.charCodeAt(i) * (i + 1);

        const random = (s) => {
            const x = Math.sin(s) * 10000;
            return x - Math.floor(x);
        };

        const result = [];
        let s = seedNum;
        for (let i = 0; i < length; i++) {
            s += i + 1; // n-linear advancement
            const rv = random(s);
            result.push(Math.floor(rv * 53)); // Modulo 53 for character space
        }
        return result;
    }

    // --- Helpers ---
    toIndex(c) {
        if (c === ' ') return 52;
        const code = c.charCodeAt(0);
        if (code >= 65 && code <= 90) return code - 65; // A-Z -> 0-25
        if (code >= 97 && code <= 122) return code - 97 + 26; // a-z -> 26-51
        return 0; // Fallback
    }

    fromIndex(i) {
        if (i === 52) return ' ';
        if (i <= 25) return String.fromCharCode(i + 65); // 0-25 -> A-Z
        return String.fromCharCode(i - 26 + 97); // 26-51 -> a-z
    }

    getCharMove(char) {
        if (!char) return 'U';
        const code = char.charCodeAt(0);
        return this.movesList[code % 6];
    }

    getStepConstant(i) {
        if (!this.stepConstants || this.stepConstants.length === 0) return 0;
        return this.stepConstants[i % this.stepConstants.length];
    }

    /**
     * Encrypts a string one character at a time, animating the cube.
     * @param {string} plaintext 
     * @param {string} ivChar - Starting character for CFB (usually 'A' or last char)
     * @param {function} onProgress - Callback(char, index) when a char is processed
     * @param {function} onComplete - Callback(fullCiphertext)
     */
    async encryptSequence(plaintext, ivChar = 'A', onProgress, onComplete) {
        let lastCipherChar = ivChar;
        let fullCiphertext = "";
        let index = 0;

        // Clean input
        const data = plaintext.replace(/[^A-Za-z ]/g, '');

        const processNext = () => {
            if (index >= data.length) {
                if (onComplete) onComplete(fullCiphertext);
                return;
            }

            const pChar = data[index];
            const move = this.getCharMove(lastCipherChar);

            // Hook into cube completion
            this.cube.onMoveComplete = () => {
                // 1. Read Sensor
                const sensorVal = this.cube.getSensorValue();

                // 2. Math: C = (P + K + RC) mod 53
                const k = this.toIndex(sensorVal);
                const p = this.toIndex(pChar);
                const rc = this.getStepConstant(index);
                
                const cVal = (p + k + rc) % 53;
                const cChar = this.fromIndex(cVal);

                // 3. Update State
                fullCiphertext += cChar;
                lastCipherChar = cChar;

                // 4. GUI Callback
                if (onProgress) onProgress(cChar, index, { p: pChar, k: sensorVal, c: cChar, rc: rc });

                // 5. Next
                index++;
                processNext();
            };

            // Trigger Animation
            this.cube.queueMove(move);
        };

        processNext();
    }

    /**
     * Decrypts a string one character at a time.
     */
    async decryptSequence(ciphertext, ivChar = 'A', onProgress, onComplete) {
        let lastCipherChar = ivChar;
        let fullPlaintext = "";
        let index = 0;

        const data = ciphertext.replace(/[^A-Za-z ]/g, '');

        const processNext = () => {
            if (index >= data.length) {
                if (onComplete) onComplete(fullPlaintext);
                return;
            }

            const cChar = data[index];
            const move = this.getCharMove(lastCipherChar);

            this.cube.onMoveComplete = () => {
                const sensorVal = this.cube.getSensorValue();

                const k = this.toIndex(sensorVal);
                const c = this.toIndex(cChar);
                const rc = this.getStepConstant(index);

                // Inverse Modulo: P = (C - K - RC) mod 53
                let pVal = (c - k - rc) % 53;
                while (pVal < 0) pVal += 53;

                const pChar = this.fromIndex(pVal);

                fullPlaintext += pChar;
                lastCipherChar = cChar;

                if (onProgress) onProgress(pChar, index, { p: pChar, k: sensorVal, c: cChar, rc: rc });

                index++;
                processNext();
            };

            this.cube.queueMove(move);
        };

        processNext();
    }
}
