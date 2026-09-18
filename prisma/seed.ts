import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { ExamPackage } from "@/lib/generated/prisma/enums";

async function seedUsers() {
  const passwordHash = await bcrypt.hash("pte123456", 10);

  await prisma.user.upsert({
    where: { email: "hocvien@ptelife.vn" },
    update: {},
    create: {
      name: "Nguyễn Thảo",
      email: "hocvien@ptelife.vn",
      passwordHash,
      examPackage: "academic",
      expiresAt: new Date("2026-12-31"),
      reservationsLeft: 2,
    },
  });

  await prisma.user.upsert({
    where: { email: "hocvien.core@ptelife.vn" },
    update: {},
    create: {
      name: "Trần Minh",
      email: "hocvien.core@ptelife.vn",
      passwordHash,
      examPackage: "core",
      expiresAt: new Date("2026-11-15"),
      reservationsLeft: 1,
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@ptelife.vn" },
    update: {},
    create: {
      name: "Admin PTE-Life",
      email: "admin@ptelife.vn",
      passwordHash,
      role: "admin",
      examPackage: "academic",
      expiresAt: new Date("2030-12-31"),
      reservationsLeft: 0,
    },
  });
}

async function seedQuestions() {
  const questions = [
    {
      questionTypeId: "read-aloud",
      skill: "speaking" as const,
      code: "RA-014",
      availableIn: ["academic", "core"] as ExamPackage[],
      content: {
        passage:
          "Climate change is one of the most pressing challenges facing humanity today. Rising temperatures have led to more frequent extreme weather events, affecting agriculture, water supplies, and coastal communities around the world.",
      },
    },
    {
      questionTypeId: "read-aloud",
      skill: "speaking" as const,
      code: "RA-015",
      availableIn: ["academic", "core"] as ExamPackage[],
      content: {
        passage:
          "The university library will extend its opening hours during the final examination period. Students are encouraged to make use of the additional study spaces available on the third and fourth floors.",
      },
    },
    {
      questionTypeId: "write-essay",
      skill: "writing" as const,
      code: "WE-006",
      availableIn: ["academic"] as ExamPackage[],
      content: {
        prompt:
          "Some people believe that technology has made our lives more complicated, while others think it has simplified daily life. Discuss both views and give your own opinion.",
        minWords: 200,
        maxWords: 300,
        timeLimitMinutes: 20,
      },
    },
    {
      questionTypeId: "reading-mcq-single",
      skill: "reading" as const,
      code: "RMS-021",
      availableIn: ["academic", "core"] as ExamPackage[],
      content: {
        passage:
          "Urban beekeeping has grown in popularity over the past decade as city dwellers seek ways to support local ecosystems. Rooftop hives now dot the skylines of many major cities, providing pollination services for parks and gardens.",
        question: "What is the main idea of the passage?",
        options: [
          "Beekeeping is banned in most cities.",
          "Urban beekeeping has become more common as a way to support ecosystems.",
          "Rooftop gardens are more popular than parks.",
          "Cities are removing green spaces.",
        ],
        correctIndex: 1,
      },
    },
    {
      questionTypeId: "listening-fill-blanks",
      skill: "listening" as const,
      code: "LFB-010",
      availableIn: ["academic", "core"] as ExamPackage[],
      content: {
        audioUrl: "/audio/listening-fill-blanks.m4a",
        segments: [
          { type: "text", value: "The seminar will start at " },
          { type: "blank", id: "b1", correctAnswer: "nine o'clock" },
          { type: "text", value: " and will run for approximately " },
          { type: "blank", id: "b2", correctAnswer: "three hours" },
          { type: "text", value: "." },
        ],
      },
    },
    {
      questionTypeId: "write-from-dictation",
      skill: "listening" as const,
      code: "WFD-033",
      availableIn: ["academic", "core"] as ExamPackage[],
      content: {
        audioUrl: "/audio/wfd-033.m4a",
        sentence: "The research team published their findings in a leading scientific journal.",
      },
    },

    // Speaking (Bước 5)
    {
      questionTypeId: "repeat-sentence",
      skill: "speaking" as const,
      code: "RS-002",
      availableIn: ["academic", "core"] as ExamPackage[],
      content: {
        audioUrl: "/audio/repeat-sentence.m4a",
        referenceText: "The library will be closed for renovations next month.",
      },
    },
    {
      questionTypeId: "describe-image",
      skill: "speaking" as const,
      code: "DI-009",
      availableIn: ["academic"] as ExamPackage[],
      content: {
        imageUrl: "/images/describe-image-bar-chart.svg",
      },
    },
    {
      questionTypeId: "retell-lecture",
      skill: "speaking" as const,
      code: "RL-004",
      availableIn: ["academic"] as ExamPackage[],
      content: {
        audioUrl: "/audio/retell-lecture.m4a",
        transcript:
          "Today we will discuss the water cycle, which describes how water moves through the atmosphere, the land, and the oceans. Water evaporates from the surface of oceans and lakes, rises into the atmosphere where it cools and condenses into clouds, and eventually falls back to the earth as precipitation. This continuous cycle is essential for sustaining all life on our planet.",
      },
    },
    {
      questionTypeId: "answer-short-question",
      skill: "speaking" as const,
      code: "ASQ-018",
      availableIn: ["academic", "core"] as ExamPackage[],
      content: {
        audioUrl: "/audio/answer-short-question.m4a",
        referenceAnswer: "astronomer",
      },
    },
    {
      questionTypeId: "summarize-group-discussion",
      skill: "speaking" as const,
      code: "SGD-003",
      availableIn: ["core"] as ExamPackage[],
      content: {
        audioUrl: "/audio/summarize-group-discussion.m4a",
        transcript:
          "Let's talk about remote work policies. Some employees prefer working from home because it saves commuting time and offers more flexibility. However, others feel that being in the office improves collaboration and team communication. Managers are now considering hybrid models that combine both approaches.",
      },
    },
    {
      questionTypeId: "respond-to-situation",
      skill: "speaking" as const,
      code: "RTS-007",
      availableIn: ["core"] as ExamPackage[],
      content: {
        situationText:
          "You have just moved to a new neighborhood. Leave a message introducing yourself to a neighbor and ask about useful places nearby.",
      },
    },

    // Writing (Bước 5)
    {
      questionTypeId: "summarize-written-text",
      skill: "writing" as const,
      code: "SWT-011",
      availableIn: ["academic"] as ExamPackage[],
      content: {
        passage:
          "Urban green spaces, such as parks, gardens, and tree-lined streets, play a vital role in improving the quality of life in cities. They provide residents with places to exercise, relax, and socialize, which can significantly reduce stress and improve mental health. In addition to their social benefits, green spaces help mitigate the urban heat island effect by providing shade and releasing moisture into the air, which cools the surrounding environment. They also support biodiversity by offering habitats for birds, insects, and small mammals that might otherwise struggle to survive in a fully built environment. Furthermore, green spaces contribute to better air quality by absorbing pollutants and producing oxygen, which is especially important in densely populated areas with high levels of traffic. Despite these benefits, many cities face challenges in maintaining and expanding green spaces due to limited land availability and competing demands for development.",
      },
    },

    // Reading (Bước 5)
    {
      questionTypeId: "reading-mcq-multiple",
      skill: "reading" as const,
      code: "RMM-012",
      availableIn: ["academic", "core"] as ExamPackage[],
      content: {
        passage:
          "The Great Barrier Reef, located off the coast of Australia, is the world's largest coral reef system. It is home to thousands of species of marine life, including fish, mollusks, and sea turtles. In recent years, rising ocean temperatures have caused significant coral bleaching, threatening the reef's biodiversity. Conservation efforts are now focused on reducing carbon emissions and establishing marine protected areas.",
        question: "Theo đoạn văn, ý nào sau đây ĐÚNG? (chọn tất cả đáp án đúng)",
        options: [
          "The Great Barrier Reef is located off the coast of Australia.",
          "The reef is home to thousands of marine species.",
          "Coral bleaching has improved the reef's biodiversity.",
          "Conservation efforts focus only on tourism.",
        ],
        correctIndexes: [0, 1],
        maxSelectable: 2,
      },
    },
    {
      questionTypeId: "reorder-paragraphs",
      skill: "reading" as const,
      code: "ROP-005",
      availableIn: ["academic", "core"] as ExamPackage[],
      content: {
        paragraphs: [
          { id: "p3", text: "The dough is then left to rise, allowing the yeast to produce carbon dioxide bubbles." },
          { id: "p1", text: "Bread has been a staple food for thousands of years, dating back to ancient civilizations." },
          { id: "p4", text: "Finally, the risen dough is baked in an oven until it develops a golden crust." },
          { id: "p2", text: "The process begins with mixing flour, water, yeast, and salt to form a dough." },
        ],
        correctOrder: ["p1", "p2", "p3", "p4"],
      },
    },
    {
      questionTypeId: "reading-fill-blanks-dropdown",
      skill: "reading" as const,
      code: "RFBD-008",
      availableIn: ["academic", "core"] as ExamPackage[],
      content: {
        segments: [
          { type: "text", value: "Many companies today are adopting remote work policies. Employees can " },
          { type: "blank", id: "b1", options: ["work", "sleep", "travel"], correctAnswer: "work" },
          { type: "text", value: " from home, which often leads to " },
          { type: "blank", id: "b2", options: ["increased", "decreased", "random"], correctAnswer: "increased" },
          { type: "text", value: " productivity. However, some managers worry about a lack of " },
          { type: "blank", id: "b3", options: ["collaboration", "vacation", "equipment"], correctAnswer: "collaboration" },
          { type: "text", value: " among team members." },
        ],
      },
    },
    {
      questionTypeId: "reading-fill-blanks-drag-drop",
      skill: "reading" as const,
      code: "RFBDD-013",
      availableIn: ["academic", "core"] as ExamPackage[],
      content: {
        segments: [
          { type: "text", value: "The museum's new exhibit features artifacts from ancient Egypt. Visitors can " },
          { type: "blank", id: "b1", correctAnswer: "view" },
          { type: "text", value: " rare pottery, jewelry, and tools used by early civilizations. The exhibit will remain " },
          { type: "blank", id: "b2", correctAnswer: "open" },
          { type: "text", value: " until the end of the year." },
        ],
        wordBank: ["view", "open", "closed", "ignore"],
      },
    },

    // Listening (Bước 5)
    {
      questionTypeId: "summarize-spoken-text",
      skill: "listening" as const,
      code: "SST-001",
      availableIn: ["academic"] as ExamPackage[],
      content: {
        audioUrl: "/audio/summarize-spoken-text.m4a",
        transcript:
          "Renewable energy sources such as solar, wind, and hydroelectric power are becoming increasingly important as the world seeks to reduce its dependence on fossil fuels. These technologies produce little to no greenhouse gas emissions during operation. However, challenges remain, including the need for efficient energy storage and the high initial cost of infrastructure. Despite these obstacles, many countries are investing heavily in renewable energy to meet long term climate goals.",
      },
    },
    {
      questionTypeId: "listening-mcq-multiple",
      skill: "listening" as const,
      code: "LMM-006",
      availableIn: ["academic", "core"] as ExamPackage[],
      content: {
        audioUrl: "/audio/listening-mcq-multiple.m4a",
        question: "Những lợi ích nào của việc tập thể dục được nhắc đến? (chọn tất cả đáp án đúng)",
        options: [
          "Improved cardiovascular health",
          "Better mood",
          "Increased height",
          "Stronger muscles",
          "Better eyesight",
        ],
        correctIndexes: [0, 1, 3],
        maxSelectable: 3,
      },
    },
    {
      questionTypeId: "highlight-correct-summary",
      skill: "listening" as const,
      code: "HCS-014",
      availableIn: ["academic"] as ExamPackage[],
      content: {
        audioUrl: "/audio/highlight-correct-summary.m4a",
        question: "Chọn đoạn tóm tắt đúng nhất với nội dung vừa nghe:",
        options: [
          "A new frog species with bright blue color and a unique mating call was found in the Amazon.",
          "A new species of blue bird was discovered in the Amazon rainforest.",
          "Scientists recorded a common mating call shared by many amphibians.",
          "A new frog species was found in Africa with an unusual color.",
        ],
        correctIndex: 0,
      },
    },
    {
      questionTypeId: "listening-mcq-single",
      skill: "listening" as const,
      code: "LMS-009",
      availableIn: ["academic", "core"] as ExamPackage[],
      content: {
        audioUrl: "/audio/listening-mcq-single.m4a",
        question: "What was the main driver of the revenue increase?",
        options: [
          "Strong sales in the technology division.",
          "A reduction in operating costs.",
          "Higher prices in the retail division.",
          "An increase in overseas investment.",
        ],
        correctIndex: 0,
      },
    },
    {
      questionTypeId: "select-missing-word",
      skill: "listening" as const,
      code: "SMW-017",
      availableIn: ["academic"] as ExamPackage[],
      content: {
        audioUrl: "/audio/select-missing-word.m4a",
        question: "Chọn từ/cụm từ đúng để hoàn thành câu:",
        options: ["spelling errors", "traffic jams", "musical notes", "weather forecasts"],
        correctIndex: 0,
      },
    },
    {
      questionTypeId: "highlight-incorrect-words",
      skill: "listening" as const,
      code: "HIW-016",
      availableIn: ["academic"] as ExamPackage[],
      content: {
        audioUrl: "/audio/highlight-incorrect-words.m4a",
        words: [
          "The", "train", "departed", "from", "platform", "three", "at", "exactly",
          "ten", "fifteen", "in", "the", "evening.",
        ],
        incorrectIndexes: [5, 12],
      },
    },
  ];

  for (const q of questions) {
    await prisma.question.upsert({
      where: { code: q.code },
      update: q,
      create: q,
    });
  }
}

async function main() {
  await seedUsers();
  await seedQuestions();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
