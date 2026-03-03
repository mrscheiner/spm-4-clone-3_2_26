"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mlsSchedule_1 = require("../src/utils/mlsSchedule");
(async () => {
    const games = await (0, mlsSchedule_1.scrapeMlsHomeSchedule)('Inter Miami', '2026');
    console.log('got', games.length);
    console.dir(games.slice(0, 5), { depth: null });
})();
