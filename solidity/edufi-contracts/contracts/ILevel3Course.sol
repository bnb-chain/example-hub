// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ILevel3Course {
    struct Lesson {
        uint256 id;
        string lessontitle;
        string[] url;
        string quizzes; // Array of quizzes associated with this lesson
    }
    struct Course {
        uint256 id;
        string title;
        string description;
        string longDescription;
        string[] objectives;
        string [] prerequisites;
        string instructor;
        string url;
        string level;
        string category;
        string duration;
        Lesson[] lessons; // Array of lessons in the course
    }
}
