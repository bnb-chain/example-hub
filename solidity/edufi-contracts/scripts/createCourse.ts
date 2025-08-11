import hre from "hardhat";
import "dotenv/config";
export interface Lesson {
  id: number;
  lessontitle: string;
  url: string[];
  quizzes: string;
}

export interface Course {
  id: number;
  title: string;
  description: string;
  longDescription: string;
  objectives: string[];
  instructor: string;
  url: string;
  level: string;
  category: string;
  prerequisites: string[];
  lessons: Lesson[];
  duration: string;
}

async function main() {
  const { ethers } = hre;

  let FactoryAddress = ``;

  const courses: Course[] = [];
  const factory = await ethers.getContractAt("CourseFactory", FactoryAddress);

  for (const course of courses) {
    const tx = await factory.addCourse(
      course.title,
      course.description,
      course.longDescription,
      course.instructor,
      course.objectives,
      course.prerequisites,
      course.category,
      course.level,
      course.url,
      course.lessons,
      course.duration,
    );
    await tx.wait();
    console.log(`Added new course ${tx.hash}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
