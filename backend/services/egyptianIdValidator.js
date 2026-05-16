/**
 * egyptianIdValidator.js — decode and validate Egyptian National IDs.
 *
 * Egyptian National IDs are exactly 14 digits with this structure:
 *
 *   D | YY | MM | DD | GG | SSSS | C
 *   1 | 2  | 2  | 2  | 2  | 4    | 1
 *
 * - D       : century (2 → 1900s, 3 → 2000s)
 * - YY      : year of birth (last 2 digits)
 * - MM      : month of birth
 * - DD      : day of birth
 * - GG      : governorate code (e.g. 21 = Cairo, 12 = Dakahlia)
 * - SSSS    : sequence number (last digit even = female, odd = male)
 * - C       : checksum digit
 *
 * Public API:
 *   validateStructure(id) → { valid, reason?, decoded? }
 *   decode(id)            → { birthDate, governorate, gender } | null
 */

const GOVERNORATES = {
  "01": "Cairo",
  "02": "Alexandria",
  "03": "Port Said",
  "04": "Suez",
  "11": "Damietta",
  "12": "Dakahlia",
  "13": "Sharqia",
  "14": "Qalyubia",
  "15": "Kafr El Sheikh",
  "16": "Gharbia",
  "17": "Monufia",
  "18": "Beheira",
  "19": "Ismailia",
  "21": "Giza",
  "22": "Beni Suef",
  "23": "Faiyum",
  "24": "Minya",
  "25": "Asyut",
  "26": "Sohag",
  "27": "Qena",
  "28": "Aswan",
  "29": "Luxor",
  "31": "Red Sea",
  "32": "New Valley",
  "33": "Matrouh",
  "34": "North Sinai",
  "35": "South Sinai",
  "88": "Foreign",
};

/**
 * Validate the structure of an Egyptian National ID.
 *
 * @param   {string|number} id
 * @returns {{ valid: boolean, reason?: string, decoded?: object }}
 */
function validateStructure(id) {
  const s = String(id || "").trim();

  if (!/^\d{14}$/.test(s)) {
    return { valid: false, reason: "الرقم القومي يجب أن يكون 14 رقماً" };
  }

  const century = s[0];
  if (century !== "2" && century !== "3") {
    return { valid: false, reason: "خانة القرن غير صحيحة (يجب أن تكون 2 أو 3)" };
  }

  const yy = parseInt(s.slice(1, 3), 10);
  const mm = parseInt(s.slice(3, 5), 10);
  const dd = parseInt(s.slice(5, 7), 10);
  const gg = s.slice(7, 9);

  // Basic month/day sanity (calendar validation comes after)
  if (mm < 1 || mm > 12) return { valid: false, reason: "شهر الميلاد غير صحيح" };
  if (dd < 1 || dd > 31) return { valid: false, reason: "يوم الميلاد غير صحيح" };

  if (!GOVERNORATES[gg]) {
    return { valid: false, reason: "كود المحافظة غير معروف" };
  }

  const fullYear = (century === "2" ? 1900 : 2000) + yy;
  const birth = new Date(Date.UTC(fullYear, mm - 1, dd));
  const calendarValid =
    birth.getUTCFullYear() === fullYear &&
    birth.getUTCMonth() === mm - 1 &&
    birth.getUTCDate() === dd;
  if (!calendarValid) {
    return { valid: false, reason: "تاريخ الميلاد المستخرج من الرقم غير صحيح" };
  }

  // Reject impossible birth dates (future / impossibly old)
  const now = new Date();
  const age = now.getUTCFullYear() - fullYear;
  if (birth > now) return { valid: false, reason: "تاريخ الميلاد في المستقبل" };
  if (age > 120) return { valid: false, reason: "عمر غير منطقي (>120 سنة)" };

  const sequence = s.slice(9, 13);
  const lastSeqDigit = parseInt(s[12], 10);
  const gender = lastSeqDigit % 2 === 0 ? "female" : "male";

  return {
    valid: true,
    decoded: {
      birthDate: birth.toISOString().slice(0, 10), // YYYY-MM-DD
      birthYear: fullYear,
      birthMonth: mm,
      birthDay: dd,
      governorateCode: gg,
      governorate: GOVERNORATES[gg],
      gender,
      sequence,
      ageYears: age,
    },
  };
}

function decode(id) {
  const result = validateStructure(id);
  return result.valid ? result.decoded : null;
}

module.exports = { validateStructure, decode, GOVERNORATES };
