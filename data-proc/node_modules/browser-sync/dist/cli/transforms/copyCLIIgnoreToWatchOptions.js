"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var immutable_1 = require("immutable");
function copyCLIIgnoreToWatchOptions(incoming) {
    if (!incoming.get("ignore")) {
        return incoming;
    }
    return incoming.updateIn(["watchOptions", "ignored"], immutable_1.List([]), function (ignored) {
        return immutable_1.List([]).concat(ignored, incoming.get("ignore"));
    });
}
exports.copyCLIIgnoreToWatchOptions = copyCLIIgnoreToWatchOptions;
//# sourceMappingURL=copyCLIIgnoreToWatchOptions.js.map