# Mermaid Diagram Examples

This document demonstrates rendering of mermaid diagrams in PDF output. Each diagram type is rendered using the active theme's mermaid color palette.

## Flowchart

```mermaid
flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Process A]
    B -->|No| D[Process B]
    C --> E[Result]
    D --> E
    E --> F[End]
```

## Sequence Diagram

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant DB

    Client->>API: POST /login
    API->>DB: Query user
    DB-->>API: User record
    API-->>Client: JWT token
    Client->>API: GET /data
    API->>API: Validate token
    API->>DB: Fetch data
    DB-->>API: Results
    API-->>Client: JSON response
```

## Class Diagram

```mermaid
classDiagram
    class Animal {
        +String name
        +int age
        +makeSound()
    }
    class Dog {
        +String breed
        +fetch()
    }
    class Cat {
        +bool indoor
        +purr()
    }
    Animal <|-- Dog
    Animal <|-- Cat
```

## State Diagram

```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> Review : Submit
    Review --> Approved : Approve
    Review --> Draft : Request Changes
    Approved --> Published : Publish
    Published --> [*]
```

## Pie Chart

```mermaid
pie title Project Time Allocation
    "Development" : 40
    "Testing" : 20
    "Design" : 15
    "Documentation" : 10
    "Meetings" : 15
```

## Entity Relationship Diagram

```mermaid
erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE_ITEM : contains
    PRODUCT ||--o{ LINE_ITEM : "is in"
    CUSTOMER {
        int id PK
        string name
        string email
    }
    ORDER {
        int id PK
        date created
        string status
    }
    PRODUCT {
        int id PK
        string name
        float price
    }
```

## Gantt Chart

```mermaid
gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    section Planning
        Requirements     :a1, 2024-01-01, 14d
        Design           :a2, after a1, 10d
    section Development
        Backend          :b1, after a2, 21d
        Frontend         :b2, after a2, 21d
    section Testing
        Integration Test :c1, after b1, 7d
        UAT              :c2, after c1, 7d
```

## Mindmap

```mermaid
mindmap
    root((Project))
        Frontend
            React
            CSS
            Components
        Backend
            API
            Database
            Auth
        DevOps
            CI/CD
            Monitoring
```

