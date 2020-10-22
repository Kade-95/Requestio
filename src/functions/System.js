export function System() {
    const mmu = {};
    mmu.connect = (params = { encode: true, data: {} }) => {
        if (params.encode == undefined) params.encode = true;

        if (params.encode == true) {
            let sentence = JSON.stringify(params.data);
            let dictionary = base.array.toSet(sentence.split('')).join('');
            let code = compressor.encodeLZW(sentence, dictionary);
            params.data = { code, dictionary, encoded: true };
        }
        return new Promise((resolve, reject) => {
            appLibrary.ajax(params)
                .then(response => {
                    try {
                        response = JSON.parse(response);
                    } catch (error) {
                    } finally {
                        if (response.encoded == true) {
                            response = JSON.parse(compressor.decodeLZW(response.code, response.dictionary));
                        }
                        resolve(response);
                    }
                })
                .catch(err => {
                    reject(err);
                });
        });
    }
    return mmu;
}