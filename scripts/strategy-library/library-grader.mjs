/**
 * How a strategy-library piece is graded. Pure functions, no files, no network,
 * so the rules can be tested and reused.
 *
 * Calibration note. The first version failed 536 of 551 pieces as "hard to
 * read", which is a grader crying wolf rather than a library that bad. Two
 * things were wrong: {{businessName}} was counted as one long unpronounceable
 * word, which scored plain sentences at grade 20; and three-word labels were
 * being graded as prose. It also failed a whole piece for its single worst
 * line. It now swaps placeholders for ordinary words, grades only real
 * sentences, and scores on how MUCH of a piece is dense - because one dense
 * line in eight is a line to rewrite, while half the piece being dense is a
 * piece to replace, and those need different answers.
 */
// Words a shop owner would not use about their own business.
const JARGON = [
  "heuristic", "funnel", "persona", "positioning", "leverage", "scalable",
  "conversion path", "low friction", "retention engine", "stakeholder",
  "acquisition strategy", "proof assets", "messaging angles", "synergy",
  "value proposition", "brand equity", "top of funnel", "cta",
];

// Grammar the template generator produced: a bare verb straight after "need".
const BROKEN_GRAMMAR = /\bneed (make|explain|show|remove|know|build|turn|prove|answer)\b/i;

export function longStrings(value, out = []) {
  if (typeof value === "string") {
    if (value.trim().length > 25) out.push(value.trim());
  } else if (Array.isArray(value)) {
    value.forEach(item => longStrings(item, out));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach(item => longStrings(item, out));
  }
  return out;
}

// Two blocks that differ only by the trade name are the same block to a reader.
export function skeleton(text, categoryTags = []) {
  let result = text;
  for (const tag of categoryTags) {
    for (const form of [tag.replace(/_/g, " "), tag]) {
      if (form.length < 3) continue;
      result = result.replace(new RegExp(form.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "<TYPE>");
    }
  }
  return result.replace(/\{\{\w+\}\}/g, "<FIELD>").replace(/\s+/g, " ").trim().toLowerCase();
}

// Plain-English reading grade, same measure the calendar copy is held to.
//
// Two corrections this data needs. Placeholders like {{businessName}} are one
// long unpronounceable token, so left in they score a plain sentence at grade
// 20. And a three-word label ("Malayalam-English local caption") is not prose;
// grading it says grade 21 about something nobody reads as a sentence. So swap
// the placeholders for an ordinary word, and only grade real sentences.
function readableText(sample) {
  return String(sample || "")
    .replace(/\{\{\s*businessName\s*\}\}/gi, "Anita")
    .replace(/\{\{\s*\w+\s*\}\}/g, "here")
    .trim();
}

// The reading-grade formula divides syllables by words, so on a short sentence
// one long word swings the result wildly: "Anita will support delivery and
// pickup around here" is plain English and scores 12.6. The measure only means
// anything on a real stretch of prose, so short lines are left ungraded rather
// than graded badly.
function isProse(sample) {
  return readableText(sample).split(/\s+/).filter(Boolean).length >= 12;
}

export function readingGrade(sample) {
  const text = readableText(sample);
  if (!text || !isProse(text)) return 0;
  const sentences = Math.max(1, (text.match(/[.!?]+/g) || []).length);
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return 0;
  const syllables = words.reduce((total, word) => {
    const groups = word.toLowerCase().replace(/[^a-z]/g, "").match(/[aeiouy]+/g);
    return total + Math.max(1, groups ? groups.length : 1);
  }, 0);
  return 0.39 * (words.length / sentences) + 11.8 * (syllables / words.length) - 15.59;
}

export function gradeBlocks(blocks) {
  // How often does each sentence shape appear across the whole library?
  const shapeCounts = new Map();
  for (const block of blocks) {
    for (const text of longStrings(block.content_json)) {
      const shape = skeleton(text, block.category_tags || []);
      shapeCounts.set(shape, (shapeCounts.get(shape) || 0) + 1);
    }
  }

  return blocks.map(block => {
    const sentences = longStrings(block.content_json);
    const faults = [];
    let score = 5;

    // 1. Reused wording. The heaviest fault, because it is what makes every
    //    report read like the same report.
    const reused = sentences.filter(text => shapeCounts.get(skeleton(text, block.category_tags || [])) > 3);
    const reusedShare = sentences.length ? reused.length / sentences.length : 0;
    if (reusedShare >= 0.5) {
      score -= 3;
      const worst = reused
        .map(text => ({ text, n: shapeCounts.get(skeleton(text, block.category_tags || [])) }))
        .sort((a, b) => b.n - a.n)[0];
      faults.push(`${Math.round(reusedShare * 100)}% of its wording is reused; one line appears ${worst.n}x in the library`);
    } else if (reusedShare >= 0.25) {
      score -= 1;
      faults.push(`${Math.round(reusedShare * 100)}% of its wording is reused elsewhere`);
    }

    // 2. Hard English. The reader is a shop owner, not a marketer.
    //    Judged on how MUCH of the piece is hard, not on its single worst line.
    //    One dense sentence in eight is a line to rewrite; half the piece being
    //    dense is a piece to replace, and those need different answers.
    const grades = sentences.filter(isProse).map(readingGrade);
    const hard = grades.filter(grade => grade > 12);
    const hardShare = grades.length ? hard.length / grades.length : 0;
    const hardest = grades.length ? Math.max(...grades) : 0;
    if (hardShare >= 0.5) {
      score -= 2;
      faults.push(`${Math.round(hardShare * 100)}% of it is hard to read (worst line grade ${hardest.toFixed(0)})`);
    } else if (hardShare >= 0.2) {
      score -= 1;
      faults.push(`${Math.round(hardShare * 100)}% of it is hard to read (worst line grade ${hardest.toFixed(0)})`);
    } else if (hardest > 16) {
      score -= 1;
      faults.push(`one very dense line (grade ${hardest.toFixed(0)})`);
    }

    // 3. Jargon.
    const body = sentences.join(" ").toLowerCase();
    const jargon = JARGON.filter(word => new RegExp(`\\b${word}\\b`).test(body));
    if (jargon.length) {
      score -= 1;
      faults.push(`uses jargon: ${jargon.join(", ")}`);
    }

    // 4. Broken sentences the template generator left behind.
    const broken = sentences.filter(text => BROKEN_GRAMMAR.test(text));
    if (broken.length) {
      score -= 1;
      faults.push(`broken sentence: "${broken[0].slice(0, 70)}..."`);
    }

    // 5. Nothing concrete to do.
    const actions = Array.isArray(block.content_json?.what_to_do) ? block.content_json.what_to_do : [];
    if (actions.length < 2) {
      score -= 1;
      faults.push("fewer than two things to actually do");
    }

    return {
      id: block.id,
      title: block.content_json?.title || block.title,
      categories: block.category_tags || [],
      claimed: block.quality_score,
      score: Math.max(1, Math.min(5, score)),
      faults,
      block,
    };
  });
}

