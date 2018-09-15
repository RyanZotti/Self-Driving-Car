var TokenType = require('../token-types');

module.exports = (function() {
    /**
    * Mark whitespaces and comments
    */
    function markSC(tokens) {
        var tokensLength = tokens.length,
        ws = -1, // flag for whitespaces
        sc = -1, // flag for whitespaces and comments
        t; // current token

        // For every token in the token list, mark spaces and line breaks
        // as spaces (set both `ws` and `sc` flags). Mark multiline comments
        // with `sc` flag.
        // If there are several spaces or tabs or line breaks or multiline
        // comments in a row, group them: take the last one's index number
        // and save it to the first token in the group as a reference
        // (e.g., `ws_last = 7` for a group of whitespaces or `sc_last = 9`
        // for a group of whitespaces and comments):
        for (var i = 0; i < tokensLength; i++) {
            t = tokens[i];
            switch (t.type) {
                case TokenType.Space:
                case TokenType.Tab:
                    t.ws = true;
                    t.sc = true;

                    if (ws === -1) ws = i;
                    if (sc === -1) sc = i;

                    break;
                case TokenType.Newline:
                    t.ws = true;
                    t.sc = true;

                    ws = ws === -1 ? i : ws;
                    sc = sc === -1 ? i : ws;

                    tokens[ws].ws_last = i - 1;
                    tokens[sc].sc_last = i - 1;
                    tokens[i].ws_last = i;
                    tokens[i].sc_last = i;

                    ws = -1;
                    sc = -1;

                    break;
                case TokenType.CommentML:
                case TokenType.CommentSL:
                    if (ws !== -1) {
                        tokens[ws].ws_last = i - 1;
                        ws = -1;
                    }

                    t.sc = true;

                    break;
                default:
                    if (ws !== -1) {
                        tokens[ws].ws_last = i - 1;
                        ws = -1;
                    }

                    if (sc !== -1) {
                        tokens[sc].sc_last = i - 1;
                        sc = -1;
                    }
            }
        }

        if (ws !== -1) tokens[ws].ws_last = i - 1;
        if (sc !== -1) tokens[sc].sc_last = i - 1;
    }

    /**
    * Pair brackets
    */
    function markBrackets(tokens) {
       var tokensLength = tokens.length;
       var ps = [], // parenthesis
           sbs = [], // square brackets
           cbs = [], // curly brackets
           t; // current token

       // For every token in the token list, if we meet an opening (left)
       // bracket, push its index number to a corresponding array.
       // If we then meet a closing (right) bracket, look at the corresponding
       // array. If there are any elements (records about previously met
       // left brackets), take a token of the last left bracket (take
       // the last index number from the array and find a token with
       // this index number) and save right bracket's index as a reference:
       for (var i = 0; i < tokens.length; i++) {
           t = tokens[i];
           switch(t.type) {
               case TokenType.LeftParenthesis:
                   ps.push(i);
                   break;
               case TokenType.RightParenthesis:
                   if (ps.length) {
                       t.left = ps.pop();
                       tokens[t.left].right = i;
                   }
                   break;
               case TokenType.LeftSquareBracket:
                   sbs.push(i);
                   break;
               case TokenType.RightSquareBracket:
                   if (sbs.length) {
                       t.left = sbs.pop();
                       tokens[t.left].right = i;
                   }
                   break;
               case TokenType.LeftCurlyBracket:
                   cbs.push(i);
                   break;
               case TokenType.RightCurlyBracket:
                   if (cbs.length) {
                       t.left = cbs.pop();
                       tokens[t.left].right = i;
                   }
                   break;
           }
       }
    }

    function markBlocks(tokens) {
        var tokensLength = tokens.length;
        var blocks = [],
            currentLN = 1,
            currentIL = 0,
            prevIL = 0,
            i = 0,
            l = tokens.length,
            iw;

        for (; i != l; i++) {
            if (!tokens[i - 1]) continue;

            // Skip all tokens on current line:
            if (tokens[i].ln == currentLN) continue;
            else currentLN = tokens[i].ln;

            // Get indent level:
            prevIL = currentIL;
            if (tokens[i].type === TokenType.Newline) continue;
            else if (tokens[i].type === TokenType.Space &&
                     tokens[i + 1] &&
                     tokens[i + 1].type === TokenType.Newline) continue;
            else if (tokens[i].type !== TokenType.Space) currentIL = 0;
            else {
                // If we don't know ident width yet, count number of spaces:
                if (!iw) iw = tokens[i].value.length;
                prevIL = currentIL;
                currentIL = tokens[i].value.length / iw;
            }

            // Decide whether it's block's start or end:
            if (prevIL === currentIL) continue;
            else if (currentIL > prevIL) {
                blocks.push(i);
                continue;
            } else {
                var il = prevIL;
                while (blocks.length > 0 && il !== currentIL) {
                    tokens[blocks.pop()].block_end = i - 1;
                    il--;
                }
            }
        }

        while (blocks.length > 0) {
            tokens[blocks.pop()].block_end = i - 1;
        }
    }

    return function(tokens) {
        markBrackets(tokens);
        markSC(tokens);
        markBlocks(tokens);
    }
})();
