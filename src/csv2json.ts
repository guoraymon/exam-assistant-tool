import {parse} from "csv";
import {readFile, writeFile} from "fs/promises";

const input = process.argv[2] || './example/test.csv';
const output = process.argv[3] || './output/test.json';

let data = [];

readFile(input).then(file => {
    parse(file, {
        columns: true
    })
        .on('readable', function () {
            let record;
            while ((record = this.read()) !== null) {
                data.push({
                    class: record.class,
                    type: record.type,
                    content: record.content,
                    options: {
                        A: record.optionA,
                        B: record.optionB,
                        C: record.optionC,
                        D: record.optionD,
                    },
                    answer: record.answer,
                    explain: record.explain,
                });
            }
        })
        .on('end', function () {
            writeFile(output, JSON.stringify(data.filter(item => {
                return item;
            }))).then(() => {
                console.log('导出成功');
            });
        })
})