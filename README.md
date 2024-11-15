# The Joy of Painting ETL Project

This project focuses on implementing an **ETL (Extract, Transform, Load)** pipeline to consolidate data about _The Joy of Painting_ TV show into a centralized database. The aim is to transform scattered and diverse data formats into a structured and usable format, enabling viewers to filter episodes based on various criteria such as broadcast month, subject matter, and color palette.

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Data Sources](#data-sources)
- [Database Design](#database-design)
- [API Design](#api-design)
- [Setup Instructions](#setup-instructions)
- [Usage](#usage)
- [Future Enhancements](#future-enhancements)

---

## Project Overview

Public broadcasting stations have received an overwhelming number of requests for information about _The Joy of Painting_ episodes. This project aims to build a backend system to support a front-end application that allows users to filter and explore episode information based on the following:

1. **Month of Original Broadcast**
2. **Subject Matter**
3. **Color Palette**

The provided data comes in various formats, such as CSV, JSON, XML, and API responses, which must be consolidated into a relational database to make it queryable and usable for building APIs.

---

## Features

- **ETL Pipeline**:  
  Extracts data from multiple sources, transforms it into a uniform structure, and loads it into a centralized PostgreSQL database.

- **Filtering Capabilities**:  
  The database design supports filtering episodes based on:

  - Month of original broadcast
  - Subject matter (e.g., mountains, lakes, trees)
  - Color palette used in paintings

- **RESTful API**:  
  An API will be developed to provide endpoints for accessing and filtering episode data.

---

## Data Sources

The data includes:

- **CSV Files**: Episode details and metadata
- **JSON Files**: Information about color palettes and their usage
- **XML Files**: Subject matter descriptions
- **API Responses**: Supplementary data from third-party services

---

## Database Design

The centralized database (PostgreSQL) is designed with the following tables:

1. **Episodes**: Stores details about each episode, including title, season, and broadcast month.
2. **Subjects**: Lists subject matters featured in each episode (e.g., mountains, lakes).
3. **Colors**: Tracks color palettes used in the episodes.
4. **Episode_Subjects**: A junction table linking episodes and their subjects.
5. **Episode_Colors**: A junction table linking episodes and their color palettes.

---

## API Design

The API will expose the following endpoints:

- **GET /episodes**  
  Retrieve all episodes with optional filters (month, subject, color).
- **GET /subjects**  
  List all available subject matters.

- **GET /colors**  
  List all colors used in the episodes.

- **GET /episodes/:id**  
  Retrieve details of a specific episode.

---

## Setup Instructions

1. **Clone the Repository**

   ```bash
   git clone https://https://github.com/chdrchz/atlas-the-joy-of-painting-api
   cd joy-of-painting-etl

   ```

2. **Install Dependencies**

   ```bash
   npm install

   ```

3. **Set Up PostgreSQL Database**

4. **Run the ETL pipeline**

5. **Start the server**
   ```bash
   npm start
   ```

---

## Usage

- Use the API to retrieve and filter episode data based on user preferences.
- Integrate the API with the front-end application to display episodes dynamically.

## License

This project is licensed under the MIT license.
