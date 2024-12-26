// Regex patterns
const alphabets = "([A-Za-z])";
const prefixes = "(Mr|St|Mrs|Ms|Dr)[.]";
const suffixes = "(Inc|Ltd|Jr|Sr|Co)";
const starters = "(Mr|Mrs|Ms|Dr|Prof|Capt|Cpt|Lt|He\\s|She\\s|It\\s|They\\s|Their\\s|Our\\s|We\\s|But\\s|However\\s|That\\s|This\\s|Wherever)";
const acronyms = "([A-Z][.][A-Z][.](?:[A-Z][.])?)";
const websites = "[.](com|net|org|io|gov|edu|me)";
const digits = "([0-9])";
const multipleDots = /\.{2,}/g;

function splitSentenceIntoClauses(sentence) {
    let pattern = /([,;:])/;
    let parts = sentence.split(pattern);

    // After splitting, parts array will have tokens and delimiters interleaved, e.g. ["This is a clause", ",", " another clause", ";", " more"]
    // Rebuild by pairing delimiter with preceding text
    let clauses = [];
    for (let i = 0; i < parts.length; i++) {
        if (i === 0) {
            clauses.push(parts[i]);
        } else if (pattern.test(parts[i])) {
            // It's a delimiter
            clauses[clauses.length - 1] += parts[i];
        } else {
            // Next clause starts
            clauses.push(parts[i]);
        }
    }
    return clauses;
}

function splitIntoSentences(text) {
    // Replicating the logic from C#
    text = text.replace(new RegExp(prefixes, 'g'), "$1<prd>");
    text = text.replace(new RegExp(websites, 'g'), "<prd>$1");
    text = text.replace(new RegExp(digits + "\\." + digits, 'g'), "$1<prd>$2");
    text = text.replace(multipleDots, function (match) {
        let length = match.length;
        // length times "<prd>" then one "<stop>"
        return "<prd>".repeat(length) + "<stop>";
    });

    if (text.indexOf("Ph.D") !== -1) {
        text = text.replace("Ph.D.", "Ph<prd>D<prd>");
    }

    text = text.replace(new RegExp("\\s" + alphabets + "\\. ", 'g'), " $1<prd> ");
    text = text.replace(new RegExp(acronyms + " " + starters, 'g'), "$1<stop> $2");
    text = text.replace(new RegExp(alphabets + "\\." + alphabets + "\\." + alphabets + "\\.", 'g'), "$1<prd>$2<prd>$3<prd>");
    text = text.replace(new RegExp(alphabets + "\\." + alphabets + "\\.", 'g'), "$1<prd>$2<prd>");
    text = text.replace(new RegExp(" " + suffixes + "\\. " + starters, 'g'), " $1<stop> $2");
    text = text.replace(new RegExp(" " + suffixes + "\\.", 'g'), " $1<prd>");
    text = text.replace(new RegExp(" " + alphabets + "\\.", 'g'), " $1<prd>");

    text = text.replace(/\./g, ".<stop>");
    text = text.replace(/\.<stop>"/g, ".\"<stop>");

    text = text.replace(/\?/g, "?<stop>");
    text = text.replace(/\?<stop>"/g, "?\"<stop>");

    text = text.replace(/!/g, "!<stop>");
    text = text.replace(/!<stop>"/g, "!\"<stop>");

    text = text.replace(/<prd>/g, ".");
    let sentences = text.split("<stop>");
    
    // Remove empty trailing sentence if any
    if (sentences.length > 0 && sentences[sentences.length - 1].trim() === "") {
        sentences.pop();
    }
    return sentences;
}