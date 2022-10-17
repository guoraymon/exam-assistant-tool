import {createReadStream, createWriteStream} from 'fs';
import * as readline from "readline";
import {stringify} from "csv";

const input = process.argv[2] || './example/test.txt';
const output = process.argv[3] || './output/test.csv';

let data = [];

const STATE = {
    idle: 0,
    type: 1, // 解析题型
    question: 2, // 解析题干
    answer: 3, // 解析答案
}

async function processLineByLine() {
    const fileStream = createReadStream(input);

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let state = STATE.idle; // 状态
    let type = null; // 题型
    let index = 0; // 索引

    for await (const line of rl) {
        // 解析答案标识
        if (line.match(/^(\d+) 年成人高等学校专升本招生全国统一考试/)) {
            continue;
        }
        if (line.match(/^(政治试题答案解析|参考答案及解析)/)) {
            console.log('开始解析答案');
            state = STATE.answer;
            continue;
        }

        if (state !== STATE.answer) {
            // 解析题型标识
            const typeMatch = /^(\S)、(选择题|辨析题|简答题|论述题)/g.exec(line);
            if (typeMatch) {
                console.log('开始解析题型', typeMatch[2]);

                state = STATE.type;
                type = typeMatch[2];
                continue;
            }

            // 解析题干标识
            if (state === STATE.type || state === STATE.question) {
                const contentMatch = /^(\d+)[.|\s](.*)/.exec(line);
                if (contentMatch) {
                    console.log('解析题干', contentMatch[1]);

                    state = STATE.question;
                    index = parseInt(contentMatch[1]);
                    data[index] = {
                        id: index,
                        type,
                        content: contentMatch[2],
                    };
                    continue;
                }
            }
        }

        switch (state) {
            // 解析题目
            case STATE.question: {
                // 解析答案
                if (line.match(/^([A-G])[.|\s]/g)) {
                    // 解析选项
                    const split = line.split(/([A-G])[.|\s]/g);
                    if (split.length > 2) {
                        split.shift();
                        for (let i = 0; i < split.length; i += 2) {
                            data[index][`option${split[i]}`] = split[i + 1].replace(/(^\s*)|(\s*$)/g, '');
                        }
                    }
                } else {
                    data[index].content += line.replace('\r', '');
                }
                break;
            }
            // 解析答案
            case STATE.answer: {
                const answerMatch = /^(\d+)\.\s*\S*答案\S*\s*(\S+)/.exec(line);
                if (answerMatch) {
                    console.log('解析答案', answerMatch[1]);
                    index = parseInt(answerMatch[1]);
                    data[answerMatch[1]]['answer'] = answerMatch[2];
                    continue;
                }

                const explainMatch = /^【解析】(.*)/.exec(line);
                if (explainMatch) {
                    data[index]['explain'] = explainMatch[1].replace('\r', '');
                } else {
                    if (['简答题', '论述题'].indexOf(data[index]['type']) !== -1) {
                        // 非首行且 序号开头 加换行
                        if (data[index]['answer'] && line.match(/^\((\d+)\)/)) {
                            data[index]['answer'] += '\r';
                        }
                        data[index]['answer'] += line.replace('\r', '');
                    } else {
                        if (!data[index]['explain']) {
                            data[index]['explain'] = '';
                        }
                        data[index]['explain'] += line.replace('\r', '');
                    }
                }
                break;
            }
        }
    }

    if (data) {
        stringify(data.filter(item => {
            return item;
        }), {
            header: true,
            quoted: true
        }).pipe(createWriteStream(output));
    }
}

processLineByLine().then(() => {
    console.log('处理完成');
});