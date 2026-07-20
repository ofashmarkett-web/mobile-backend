const randomDigits = (length) => {
  let digits = "";

  for (let i = 0; i < length; i += 1) {
    digits += Math.floor(Math.random() * 10);
  }

  return digits;
};

const generateCode = (prefix = "OFM", length = 4) => `${prefix}-${randomDigits(length)}`;

const generateUniqueOrderNo = async (OrderModel) => {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = generateCode("OFM", 4);
    const existing = await OrderModel.findOne({ where: { orderNo: candidate } });

    if (!existing) return candidate;
  }

  return generateCode("OFM", 8);
};

module.exports = { randomDigits, generateCode, generateUniqueOrderNo };
