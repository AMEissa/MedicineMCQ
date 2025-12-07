# Study MCQ Application

## Overview
This is a web-based Multiple Choice Questions (MCQ) study application designed for medical students. It provides an interactive platform to practice questions from different subjects and lessons, with support for random practice sets, lesson-specific quizzes, and finals-style exam simulations.

## Current State
The application is fully functional and ready for deployment. All features are working correctly including the frontend interface and backend API endpoints.

## Project Structure

### Backend (`server.js`)
- Express.js server providing REST API endpoints
- Serves static frontend files from `/public` directory
- Loads MCQ data from `/data/mcqs/` directory
- Runs on port 5000 with CORS enabled

### Frontend (`/public`)
- Static HTML/CSS/JavaScript application
- Three study modes:
  - **Finals Generator**: Creates exam-style tests with fixed ratios (50% pharmacology, 50% pathology)
  - **By Lesson**: Select specific lessons and number of questions
  - **Random Set**: Generate random questions from all or selected subjects
- Uses ES6 modules for JavaScript

### Data (`/data/mcqs/`)
- JSON files organized by subject folders:
  - `/pathology/`: Lessons 1-10 (10 questions each)
  - `/pharmacology/`: Lesson 1 (CNS - 45 questions), Lesson 2 (GIT - 72 questions)
- Total: 217 questions across 12 lessons

## API Endpoints

### GET `/api/lessons`
List all available lessons with question counts.
- Query params: `subject` (optional filter), `page`, `pageSize`
- Returns: Array of lessons with titles and counts

### GET `/api/mcqs`
Retrieve questions by lesson or subject with pagination.
- Query params: `lesson` OR `subject`, `page`, `pageSize`
- Returns: Paginated questions with total count

### GET `/api/mcqs/random`
Get random questions from selected subjects.
- Query params: `count`, `subject` (pharmacology/pathology/both)
- Returns: Random selection of questions

### GET `/api/mcqs/finals`
Generate finals-style exam with fixed subject ratios.
- Query params: `count` (default: 50)
- Returns: Mixed questions following 50/50 pharmacology/pathology ratio

## Dependencies
- **express** (5.2.1): Web server framework
- **cors** (2.8.5): Cross-Origin Resource Sharing middleware
- **Node.js** (20.19.3): Runtime environment

## Development
- Workflow: `Start application` runs `npm start`
- Server binds to `0.0.0.0:5000` for Replit compatibility
- No build step required (static frontend)

## Deployment
- Configured for autoscale deployment
- Production command: `node server.js`
- No build process needed
- Environment: Node.js 20.x

## Recent Changes
- December 7, 2025: Fixed bug in server diagnostics logging (line 208)
- December 7, 2025: Configured for Replit deployment
- December 7, 2025: Set up workflow and deployment configuration

## Features
- Responsive web interface
- Question shuffling for varied practice
- Pagination support for large question sets
- Subject-specific and mixed practice modes
- Exam simulation with configurable ratios
- RESTful API for potential mobile app integration

## Technical Notes
- Frontend uses ES6 modules (`type="module"` in script tags)
- Questions are loaded recursively from nested folder structure
- Automatic natural sorting of lessons by number
- Supports both array-format and object-format JSON files
