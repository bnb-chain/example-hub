// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Coursecontract.sol";
import "./ILevel3Course.sol";

contract CourseFactory is Ownable, ILevel3Course {
    Level3Course public level3Course;
    uint256 public courseCounter;
    mapping(uint256 => Course) public courses;

    event CourseAdded(uint256 indexed id, string title);
    event CourseEdited(uint256 indexed id, string title);
    event QuizAdded(uint256 indexed courseId, uint256 lessonId);
    event LessonAdded(uint256 indexed courseId, uint256 lessonId, string title);

    constructor(address _level3course, address owner) Ownable(owner) {
        courseCounter = 0;
        level3Course = Level3Course(_level3course);
    }

    function numCourses() public view returns (uint256) {
        return courseCounter;
    }

    function addCourse(
        string memory _title,
        string memory _description,
        string memory _longDescription,
        string memory _instructor,
        string[] memory _objectives,
        string[] memory _prerequisites,
        string memory _category,
        string memory _level,
        string memory _url,
        Lesson[] memory lessons,
         string memory _duration
    ) public onlyOwner {
        Course storage c = courses[courseCounter];
        c.id = courseCounter;
        c.title = _title;
        c.description = _description;
        c.level = _level;
        c.url = _url;
        c.longDescription = _longDescription;
        c.instructor = _instructor;
        c.objectives = _objectives;
        c.category = _category;
        c.prerequisites = _prerequisites;
        c.lessons = lessons;
        c.duration = _duration;
        level3Course.updateCourseRegistry(c, courseCounter);
        emit CourseAdded(courseCounter, _title);
        courseCounter = courseCounter + 1;
    }

    function editCourse(
        uint256 _courseId,
        string memory _title,
        string memory _description,
        string memory _longDescription,
        string memory _instructor,
        string[] memory _objectives,
        string[] memory _prerequisites,
        string memory _category,
        string memory _level,
        string memory _url,
        Lesson[] memory _lessons,
        string memory _duration
    ) public onlyOwner {
        Course storage c = courses[_courseId];
        c.title = _title;
        c.description = _description;
        c.level = _level;
        c.url = _url;
        c.longDescription = _longDescription;
        c.instructor = _instructor;
        c.objectives = _objectives;
        c.lessons = _lessons;
        c.category = _category;
        c.prerequisites = _prerequisites;
        c.duration = _duration;
        level3Course.updateCourse(c, _courseId);
        emit CourseEdited(_courseId, _title);
    }

    function addQuiz(
        uint256 _courseId,
        uint256 _lessonid,
        string memory quizzes
    ) public onlyOwner {
        require(_courseId < courseCounter, "Course does not exist");
        courses[_courseId].lessons[_lessonid].quizzes = quizzes;
        level3Course.updateCourse(courses[_courseId], _courseId);
        emit QuizAdded(_courseId, _lessonid);
    }

    function editQuiz(
        uint256 _courseId,
        uint256 _lessonid,
        string memory quizzes
    ) public onlyOwner {
        require(_courseId < courseCounter, "Course does not exist");
        courses[_courseId].lessons[_lessonid].quizzes = quizzes;
        level3Course.updateCourse(courses[_courseId], _courseId);
        emit QuizAdded(_courseId, _lessonid);
    }

    function addLesson(
        uint256 _courseId,
        string memory _text,
        string[] memory _url
    ) public onlyOwner {
        require(_courseId < courseCounter, "Course does not exist");

        Lesson storage newLesson = courses[_courseId].lessons.push();
        newLesson.id = courses[_courseId].lessons.length - 1;
        newLesson.lessontitle = _text;
        newLesson.url = _url;
        level3Course.updateCourse(courses[_courseId], _courseId);
        emit LessonAdded(_courseId, newLesson.id, _text);
    }

    function editLesson(
        uint256 _courseId,
        uint256 _lessonId,
        string memory _text,
        string[] memory _url
    ) public onlyOwner {
        require(_courseId < courseCounter, "Course does not exist");

        Lesson storage lesson = courses[_courseId].lessons[_lessonId];
        lesson.lessontitle = _text;
        lesson.url = _url;
        level3Course.updateCourse(courses[_courseId], _courseId);
        emit LessonAdded(_courseId, lesson.id, _text);
    }
}
