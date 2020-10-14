export function System() {
    const mmu = {};
    mmu.connect = (params = { encode: true, data: {} }) => {
        if (params.encode == undefined) params.encode = true;

        if (params.encode == true) {
            let sentence = JSON.stringify(params.data);
            let dictionary = kerdx.array.toSet(sentence.split('')).join('');
            let code = compressor.encodeLZW(sentence, dictionary);
            params.data = { code, dictionary, encoded: true };
        }

        return new Promise((resolve, reject) => {
            appLibrary.ajax(params)
                .then(result => {
                    result = JSON.parse(result);
                    if (result.encoded == true) {
                        result = JSON.parse(compressor.decodeLZW(result.code, result.dictionary));
                    }
                    resolve(result);
                })
                .catch(err => {
                    reject(err);
                });
        });
    }
    return mmu;
}