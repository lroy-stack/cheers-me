import { Anthropic } from './claude'

export const AI_TOOLS: Anthropic.Tool[] = [
  {
    name: "query_sales",
    description: "Query sales data for a date range. Returns revenue breakdown by category (food, drinks, cocktails, beer, desserts), total covers, average ticket, and comparison with previous period.",
    input_schema: {
      type: "object",
      properties: {
        date_from: {
          type: "string",
          description: "Start date (YYYY-MM-DD)"
        },
        date_to: {
          type: "string",
          description: "End date (YYYY-MM-DD). Defaults to date_from for single day."
        },
        compare_with: {
          type: "string",
          enum: ["previous_period", "same_period_last_year", "none"],
          description: "Comparison period"
        }
      },
      required: ["date_from"]
    }
  },
  {
    name: "get_stock_levels",
    description: "Get current stock levels. Can filter by category or show only items below minimum stock. Returns product name, current stock, min stock, days until depleted (based on average daily consumption).",
    input_schema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description: "Filter by category: food, drink, beer, wine, spirits, supplies"
        },
        only_low_stock: {
          type: "boolean",
          description: "Only show items below minimum stock level"
        },
        only_beer: {
          type: "boolean",
          description: "Only show the 22 craft beers on tap"
        }
      }
    }
  },
  {
    name: "get_staff_schedule",
    description: "Get staff schedules for a date or date range. Returns who is working, their shift times, role, and any coverage gaps.",
    input_schema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Date to check (YYYY-MM-DD)"
        },
        date_to: {
          type: "string",
          description: "End date for range"
        },
        employee_id: {
          type: "string",
          description: "Filter by specific employee"
        },
        role: {
          type: "string",
          description: "Filter by role"
        }
      },
      required: ["date"]
    }
  },
  {
    name: "get_reservations",
    description: "Get reservations for a date. Returns guest name, party size, time, table, status, special requests.",
    input_schema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Date (YYYY-MM-DD)"
        },
        status: {
          type: "string",
          enum: ["pending", "confirmed", "seated", "completed", "cancelled", "no_show"],
          description: "Filter by reservation status"
        }
      },
      required: ["date"]
    }
  },
  {
    name: "generate_social_post",
    description: "Generate a social media post for Instagram/Facebook. Returns text in multiple languages with hashtags and suggested posting time.",
    input_schema: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "What the post is about (sunset tonight, new menu, DJ event, sports, promotion)"
        },
        platform: {
          type: "string",
          enum: ["instagram", "facebook", "both"],
          description: "Target platform"
        },
        tone: {
          type: "string",
          enum: ["casual", "exciting", "elegant", "informative"],
          description: "Post tone"
        },
        languages: {
          type: "array",
          items: { type: "string" },
          description: "Languages to generate: en, nl, es"
        }
      },
      required: ["topic"]
    }
  },
  {
    name: "draft_newsletter",
    description: "Generate a newsletter draft with this week's events, menu highlights, and promotions. Queries events and menu for current data.",
    input_schema: {
      type: "object",
      properties: {
        week_start: {
          type: "string",
          description: "Monday of the target week (YYYY-MM-DD)"
        },
        languages: {
          type: "array",
          items: { type: "string" },
          description: "Languages to generate: en, nl, es"
        },
        include_events: {
          type: "boolean",
          description: "Include this week's events"
        },
        include_menu_highlights: {
          type: "boolean",
          description: "Include menu highlights"
        },
        custom_message: {
          type: "string",
          description: "Additional message to include"
        }
      },
      required: ["week_start"]
    }
  },
  {
    name: "get_events",
    description: "Get scheduled events (DJ nights, sports broadcasts, themed nights) for a date range.",
    input_schema: {
      type: "object",
      properties: {
        date_from: {
          type: "string",
          description: "Start date (YYYY-MM-DD)"
        },
        date_to: {
          type: "string",
          description: "End date (YYYY-MM-DD)"
        },
        event_type: {
          type: "string",
          enum: ["dj_night", "sports", "themed", "private", "all"],
          description: "Filter by event type"
        }
      },
      required: ["date_from"]
    }
  },
  {
    name: "query_financials",
    description: "Query financial data: P&L, cost ratios, expense breakdown, budget vs actual. Returns formatted financial summary.",
    input_schema: {
      type: "object",
      properties: {
        period: {
          type: "string",
          enum: ["today", "this_week", "this_month", "last_month", "custom"],
          description: "Time period for the query"
        },
        date_from: {
          type: "string",
          description: "Start date for custom period (YYYY-MM-DD)"
        },
        date_to: {
          type: "string",
          description: "End date for custom period (YYYY-MM-DD)"
        },
        metric: {
          type: "string",
          enum: ["pnl", "food_cost", "beverage_cost", "labor_cost", "expenses", "all"],
          description: "Specific metric to query"
        }
      },
      required: ["period"]
    }
  },
  {
    name: "get_reviews",
    description: "Get recent reviews across platforms. Can filter by sentiment or pending responses.",
    input_schema: {
      type: "object",
      properties: {
        days: {
          type: "integer",
          description: "Reviews from the last N days (default: 7)"
        },
        sentiment: {
          type: "string",
          enum: ["positive", "neutral", "negative", "all"],
          description: "Filter by review sentiment"
        },
        pending_response: {
          type: "boolean",
          description: "Only show reviews without a response"
        }
      }
    }
  },
  {
    name: "draft_review_reply",
    description: "Generate a professional reply to a customer review. Tone adapts to sentiment (grateful for positive, empathetic for negative).",
    input_schema: {
      type: "object",
      properties: {
        review_id: {
          type: "string",
          description: "UUID of the review to respond to"
        },
        tone: {
          type: "string",
          enum: ["professional", "friendly", "empathetic"],
          description: "Reply tone"
        },
        language: {
          type: "string",
          enum: ["en", "nl", "es", "de"],
          description: "Language for the reply"
        }
      },
      required: ["review_id"]
    }
  },
  {
    name: "suggest_schedule",
    description: "Generate a schedule suggestion for a specific date or week based on historical patterns, events, and staff availability.",
    input_schema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Starting date (YYYY-MM-DD)"
        },
        week: {
          type: "boolean",
          description: "Generate for full week starting from date"
        }
      },
      required: ["date"]
    }
  },
  {
    name: "predict_demand",
    description: "Predict demand for upcoming days based on historical data, weather, events, and day of week patterns.",
    input_schema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Date to predict for (YYYY-MM-DD)"
        },
        metric: {
          type: "string",
          enum: ["covers", "revenue", "beer_consumption", "food_orders"],
          description: "Metric to predict"
        }
      },
      required: ["date"]
    }
  },

  // ============================================
  // WRITE TOOLS (require user confirmation)
  // ============================================

  {
    name: "create_shift",
    description: "Create a work shift for an employee. Requires employee_id, date, start and end times. Optionally specify a role override.",
    input_schema: {
      type: "object",
      properties: {
        employee_id: {
          type: "string",
          description: "UUID of the employee"
        },
        date: {
          type: "string",
          description: "Shift date (YYYY-MM-DD)"
        },
        start_time: {
          type: "string",
          description: "Shift start time (HH:MM)"
        },
        end_time: {
          type: "string",
          description: "Shift end time (HH:MM)"
        },
        role: {
          type: "string",
          description: "Role for this shift (e.g., kitchen, bar, waiter). Defaults to employee's primary role."
        }
      },
      required: ["employee_id", "date", "start_time", "end_time"]
    }
  },
  {
    name: "update_shift",
    description: "Update an existing shift's times or role. Look up the shift first with get_staff_schedule.",
    input_schema: {
      type: "object",
      properties: {
        shift_id: {
          type: "string",
          description: "UUID of the shift to update"
        },
        start_time: {
          type: "string",
          description: "New start time (HH:MM)"
        },
        end_time: {
          type: "string",
          description: "New end time (HH:MM)"
        },
        role: {
          type: "string",
          description: "New role for this shift"
        }
      },
      required: ["shift_id"]
    }
  },
  {
    name: "delete_shift",
    description: "Delete a shift from the schedule. Look up the shift first with get_staff_schedule.",
    input_schema: {
      type: "object",
      properties: {
        shift_id: {
          type: "string",
          description: "UUID of the shift to delete"
        }
      },
      required: ["shift_id"]
    }
  },
  {
    name: "approve_leave_request",
    description: "Approve an employee's leave/vacation request.",
    input_schema: {
      type: "object",
      properties: {
        leave_id: {
          type: "string",
          description: "UUID of the leave request to approve"
        }
      },
      required: ["leave_id"]
    }
  },
  {
    name: "update_employee",
    description: "Update employee details such as name, phone, email, role, or hourly rate.",
    input_schema: {
      type: "object",
      properties: {
        employee_id: {
          type: "string",
          description: "UUID of the employee"
        },
        name: {
          type: "string",
          description: "Updated name"
        },
        phone: {
          type: "string",
          description: "Updated phone number"
        },
        email: {
          type: "string",
          description: "Updated email address"
        },
        role: {
          type: "string",
          description: "Updated role"
        },
        hourly_rate: {
          type: "number",
          description: "Updated hourly rate in EUR"
        }
      },
      required: ["employee_id"]
    }
  },
  {
    name: "create_reservation",
    description: "Create a new reservation. Requires guest name, party size, date and time.",
    input_schema: {
      type: "object",
      properties: {
        guest_name: {
          type: "string",
          description: "Name of the guest"
        },
        party_size: {
          type: "integer",
          description: "Number of guests"
        },
        reservation_date: {
          type: "string",
          description: "Reservation date (YYYY-MM-DD)"
        },
        reservation_time: {
          type: "string",
          description: "Reservation time (HH:MM)"
        },
        guest_phone: {
          type: "string",
          description: "Guest phone number"
        },
        guest_email: {
          type: "string",
          description: "Guest email address"
        },
        special_requests: {
          type: "string",
          description: "Special requests or notes"
        },
        table_id: {
          type: "string",
          description: "UUID of table to assign (optional)"
        }
      },
      required: ["guest_name", "party_size", "reservation_date", "reservation_time"]
    }
  },
  {
    name: "update_reservation_status",
    description: "Update the status of a reservation (confirm, cancel, mark as seated, completed, or no-show).",
    input_schema: {
      type: "object",
      properties: {
        reservation_id: {
          type: "string",
          description: "UUID of the reservation"
        },
        status: {
          type: "string",
          enum: ["pending", "confirmed", "seated", "completed", "cancelled", "no_show"],
          description: "New status"
        }
      },
      required: ["reservation_id", "status"]
    }
  },
  {
    name: "assign_table",
    description: "Assign or reassign a table to a reservation.",
    input_schema: {
      type: "object",
      properties: {
        reservation_id: {
          type: "string",
          description: "UUID of the reservation"
        },
        table_id: {
          type: "string",
          description: "UUID of the table to assign"
        }
      },
      required: ["reservation_id", "table_id"]
    }
  },
  {
    name: "create_event",
    description: "Create a new event (DJ night, sports broadcast, themed night, private event).",
    input_schema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Event title"
        },
        event_date: {
          type: "string",
          description: "Event date (YYYY-MM-DD)"
        },
        start_time: {
          type: "string",
          description: "Start time (HH:MM)"
        },
        end_time: {
          type: "string",
          description: "End time (HH:MM)"
        },
        event_type: {
          type: "string",
          enum: ["dj_night", "sports", "themed", "private"],
          description: "Type of event"
        },
        description: {
          type: "string",
          description: "Event description"
        },
        dj_id: {
          type: "string",
          description: "UUID of the DJ (for DJ night events)"
        }
      },
      required: ["title", "event_date", "start_time"]
    }
  },
  {
    name: "update_event",
    description: "Update an existing event's details.",
    input_schema: {
      type: "object",
      properties: {
        event_id: {
          type: "string",
          description: "UUID of the event to update"
        },
        title: {
          type: "string",
          description: "Updated title"
        },
        event_date: {
          type: "string",
          description: "Updated date (YYYY-MM-DD)"
        },
        start_time: {
          type: "string",
          description: "Updated start time (HH:MM)"
        },
        end_time: {
          type: "string",
          description: "Updated end time (HH:MM)"
        },
        event_type: {
          type: "string",
          enum: ["dj_night", "sports", "themed", "private"],
          description: "Updated event type"
        },
        description: {
          type: "string",
          description: "Updated description"
        },
        status: {
          type: "string",
          description: "Updated status"
        }
      },
      required: ["event_id"]
    }
  },
  {
    name: "record_stock_movement",
    description: "Record a stock movement (product received or consumed). Use movement_type 'in' for deliveries and 'out' for consumption.",
    input_schema: {
      type: "object",
      properties: {
        product_id: {
          type: "string",
          description: "UUID of the product"
        },
        quantity: {
          type: "number",
          description: "Quantity moved (positive number)"
        },
        movement_type: {
          type: "string",
          enum: ["in", "out"],
          description: "Direction: 'in' = received/restocked, 'out' = consumed/sold"
        },
        notes: {
          type: "string",
          description: "Optional notes about the movement"
        },
        date: {
          type: "string",
          description: "Date of movement (YYYY-MM-DD). Defaults to today."
        }
      },
      required: ["product_id", "quantity", "movement_type"]
    }
  },
  {
    name: "create_purchase_order",
    description: "Create a purchase order for stock replenishment.",
    input_schema: {
      type: "object",
      properties: {
        supplier_id: {
          type: "string",
          description: "UUID of the supplier"
        },
        supplier_name: {
          type: "string",
          description: "Supplier name (if supplier_id not known)"
        },
        items: {
          type: "array",
          description: "Array of items to order",
          items: {
            type: "object",
            properties: {
              product_id: {
                type: "string",
                description: "UUID of the product"
              },
              quantity: {
                type: "number",
                description: "Quantity to order"
              },
              unit_price: {
                type: "number",
                description: "Price per unit in EUR"
              }
            },
            required: ["product_id", "quantity"]
          }
        },
        notes: {
          type: "string",
          description: "Order notes"
        },
        expected_delivery: {
          type: "string",
          description: "Expected delivery date (YYYY-MM-DD)"
        }
      },
      required: ["items"]
    }
  },
  {
    name: "save_tax_declaration",
    description: "Save a tax declaration (Modelo 303, 111, or 347) to the database. Fetches current calculated data and stores it with a status (draft or submitted). Requires user confirmation.",
    input_schema: {
      type: "object",
      properties: {
        modelo: {
          type: "string",
          enum: ["303", "111", "347"],
          description: "Tax form model number"
        },
        year: {
          type: "integer",
          description: "Fiscal year"
        },
        quarter: {
          type: "integer",
          description: "Quarter (1-4). Required for 303 and 111."
        },
        status: {
          type: "string",
          enum: ["draft", "submitted"],
          description: "Declaration status. Defaults to draft."
        },
        notes: {
          type: "string",
          description: "Optional notes for the declaration"
        }
      },
      required: ["modelo", "year"]
    }
  },
  {
    name: "record_daily_sales",
    description: "Record daily sales figures by category (food, drinks, cocktails, beer, desserts) and total covers.",
    input_schema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Sales date (YYYY-MM-DD)"
        },
        food_revenue: {
          type: "number",
          description: "Food revenue in EUR"
        },
        drink_revenue: {
          type: "number",
          description: "Non-alcoholic drink revenue in EUR"
        },
        cocktail_revenue: {
          type: "number",
          description: "Cocktail revenue in EUR"
        },
        beer_revenue: {
          type: "number",
          description: "Beer revenue in EUR"
        },
        dessert_revenue: {
          type: "number",
          description: "Dessert revenue in EUR"
        },
        total_covers: {
          type: "integer",
          description: "Total number of guests served"
        }
      },
      required: ["date"]
    }
  },
  {
    name: "record_expense",
    description: "Record an overhead expense (rent, utilities, maintenance, supplies, etc.).",
    input_schema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description: "Expense category (rent, utilities, maintenance, supplies, marketing, insurance, other)"
        },
        amount: {
          type: "number",
          description: "Expense amount in EUR"
        },
        description: {
          type: "string",
          description: "Description of the expense"
        },
        date: {
          type: "string",
          description: "Expense date (YYYY-MM-DD). Defaults to today."
        },
        vendor: {
          type: "string",
          description: "Vendor or payee name"
        },
        receipt_ref: {
          type: "string",
          description: "Receipt or invoice reference number"
        }
      },
      required: ["category", "amount"]
    }
  },
  {
    name: "close_register",
    description: "Close the cash register for the day. Records cash counted, card totals, and any discrepancies.",
    input_schema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Date to close (YYYY-MM-DD)"
        },
        cash_counted: {
          type: "number",
          description: "Actual cash counted in the register (EUR)"
        },
        card_total: {
          type: "number",
          description: "Total card payments for the day (EUR)"
        },
        expected_cash: {
          type: "number",
          description: "Expected cash based on POS system (EUR)"
        },
        notes: {
          type: "string",
          description: "Any notes about discrepancies or issues"
        }
      },
      required: ["date", "cash_counted"]
    }
  },

  // ============================================
  // ANALYTICAL TOOLS (read-only, advanced analysis)
  // ============================================

  // ============================================
  // TAX / FISCAL TOOLS
  // ============================================

  {
    name: "query_tax_data",
    description: "Query calculated tax data for Spanish fiscal forms (Modelo 303 IVA, 111 IRPF, 347 Annual Operations). Returns computed amounts and links to official forms and PDFs.",
    input_schema: {
      type: "object",
      properties: {
        modelo: {
          type: "string",
          enum: ["303", "111", "347"],
          description: "Tax form model number"
        },
        year: {
          type: "integer",
          description: "Fiscal year"
        },
        quarter: {
          type: "integer",
          description: "Quarter (1-4). Required for modelo 303 and 111, not used for 347."
        }
      },
      required: ["modelo", "year"]
    }
  },
  {
    name: "generate_tax_form_url",
    description: "Generate URLs for the official pre-filled HTML tax form and PDF download for a given modelo, year, and quarter.",
    input_schema: {
      type: "object",
      properties: {
        modelo: {
          type: "string",
          enum: ["303", "111", "347"],
          description: "Tax form model number"
        },
        year: {
          type: "integer",
          description: "Fiscal year"
        },
        quarter: {
          type: "integer",
          description: "Quarter (1-4). Required for 303 and 111."
        }
      },
      required: ["modelo", "year"]
    }
  },

  // ============================================
  // COCKTAIL TOOLS (read-only)
  // ============================================

  {
    name: "get_cocktail_recipe",
    description: "Get the full recipe for a cocktail including ingredients, preparation steps, glass type, garnish, and cost breakdown. Search by name or menu_item_id.",
    input_schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Cocktail name (or partial name) to search for"
        },
        menu_item_id: {
          type: "string",
          description: "UUID of the menu item (if known)"
        }
      }
    }
  },
  {
    name: "get_cocktail_cost",
    description: "Get the cost breakdown for a cocktail from its ingredient stock costs. Shows each ingredient's cost contribution and total margin.",
    input_schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Cocktail name to look up"
        },
        menu_item_id: {
          type: "string",
          description: "UUID of the menu item (if known)"
        }
      }
    }
  },
  {
    name: "search_cocktails_by_ingredient",
    description: "Find all cocktails that use a specific spirit or ingredient. Useful for checking what cocktails are affected when a spirit is low on stock.",
    input_schema: {
      type: "object",
      properties: {
        ingredient: {
          type: "string",
          description: "Ingredient or spirit name to search for (e.g., 'vodka', 'rum', 'Campari')"
        }
      },
      required: ["ingredient"]
    }
  },
  {
    name: "get_cocktail_preparation_guide",
    description: "Get a step-by-step preparation guide for a cocktail in the specified language. Designed for bar staff training.",
    input_schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Cocktail name"
        },
        language: {
          type: "string",
          enum: ["en", "nl", "es", "de"],
          description: "Language for the preparation steps (default: en)"
        }
      },
      required: ["name"]
    }
  },
  {
    name: "suggest_cocktail",
    description: "Suggest cocktails based on flavor preference, base spirit, occasion, or mood. Returns matching cocktails from the menu with brief descriptions.",
    input_schema: {
      type: "object",
      properties: {
        flavor: {
          type: "string",
          enum: ["sweet", "sour", "bitter", "spirit_forward", "tropical", "refreshing", "creamy", "spicy", "herbal", "smoky", "fruity", "coffee"],
          description: "Desired flavor profile"
        },
        spirit: {
          type: "string",
          description: "Preferred base spirit (e.g., 'rum', 'vodka', 'gin', 'tequila', 'bourbon')"
        },
        occasion: {
          type: "string",
          description: "Occasion or mood (e.g., 'hot day', 'after dinner', 'celebration', 'relaxing')"
        },
        difficulty: {
          type: "string",
          enum: ["easy", "medium", "advanced"],
          description: "Maximum difficulty level"
        }
      }
    }
  },

  {
    name: "analyze_trends",
    description: "Analyze sales trends over a date range. Returns moving averages, peak days, day-of-week patterns, and trend direction.",
    input_schema: {
      type: "object",
      properties: {
        date_from: {
          type: "string",
          description: "Start date (YYYY-MM-DD)"
        },
        date_to: {
          type: "string",
          description: "End date (YYYY-MM-DD)"
        },
        metric: {
          type: "string",
          enum: ["revenue", "covers", "avg_ticket"],
          description: "Metric to analyze"
        }
      },
      required: ["date_from", "date_to"]
    }
  },
  {
    name: "compare_periods",
    description: "Compare two arbitrary date ranges side by side. Returns totals, averages, and percentage differences for all metrics.",
    input_schema: {
      type: "object",
      properties: {
        period1_from: {
          type: "string",
          description: "Period 1 start date (YYYY-MM-DD)"
        },
        period1_to: {
          type: "string",
          description: "Period 1 end date (YYYY-MM-DD)"
        },
        period2_from: {
          type: "string",
          description: "Period 2 start date (YYYY-MM-DD)"
        },
        period2_to: {
          type: "string",
          description: "Period 2 end date (YYYY-MM-DD)"
        }
      },
      required: ["period1_from", "period1_to", "period2_from", "period2_to"]
    }
  },
  {
    name: "employee_performance",
    description: "Analyze employee performance: hours worked, labor cost, shifts per week, average hours per shift. Can filter by employee or show all.",
    input_schema: {
      type: "object",
      properties: {
        employee_id: {
          type: "string",
          description: "UUID of a specific employee (optional, omit for all)"
        },
        date_from: {
          type: "string",
          description: "Start date (YYYY-MM-DD)"
        },
        date_to: {
          type: "string",
          description: "End date (YYYY-MM-DD)"
        }
      },
      required: ["date_from", "date_to"]
    }
  },
  {
    name: "profit_analysis",
    description: "Full P&L analysis with cost ratios vs targets, labor efficiency, and actionable recommendations. Use for deep financial insights.",
    input_schema: {
      type: "object",
      properties: {
        period: {
          type: "string",
          enum: ["today", "this_week", "this_month", "custom"],
          description: "Analysis period"
        },
        date_from: {
          type: "string",
          description: "Start date for custom period (YYYY-MM-DD)"
        },
        date_to: {
          type: "string",
          description: "End date for custom period (YYYY-MM-DD)"
        }
      },
      required: ["period"]
    }
  },

  // ============================================
  // SUB-AGENT DELEGATION TOOLS
  // ============================================

  {
    name: "delegate_document_generator",
    description: "Delegate document generation to a specialized sub-agent. Generates PDFs/HTML with GrandCafe Cheers branding. Document types: menu_card, financial_report, employee_schedule, invoice, compliance, marketing.",
    input_schema: {
      type: "object",
      properties: {
        document_type: {
          type: "string",
          enum: ["menu_card", "financial_report", "employee_schedule", "invoice", "compliance", "marketing"],
          description: "Type of document to generate"
        },
        title: {
          type: "string",
          description: "Document title"
        },
        context: {
          type: "string",
          description: "Data or context to include in the document"
        }
      },
      required: ["document_type", "title"]
    }
  },
  {
    name: "delegate_web_researcher",
    description: "Delegate web research to a specialized sub-agent. Searches the internet for football matches, local events in Mallorca, competitor analysis, weather forecasts, tourism trends.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "What to research"
        },
        research_type: {
          type: "string",
          enum: ["sports", "events", "weather", "competitors", "tourism", "general"],
          description: "Type of research"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "delegate_schedule_optimizer",
    description: "Delegate schedule & task planning to a specialized sub-agent. Queries employees, availability, leaves, contracts, events, and restaurant settings dynamically from DB. Can generate schedules and task plans, save them as drafts, publish them, and export to Excel. All shift definitions and labor constraints are loaded from settings (never hardcoded). Always confirms with user before writing.",
    input_schema: {
      type: "object",
      properties: {
        week_start: {
          type: "string",
          description: "Monday of the target week (YYYY-MM-DD)"
        },
        action: {
          type: "string",
          enum: ["schedule", "optimize", "task_plan", "both", "query"],
          description: "Action: schedule/optimize (generate shift schedule), task_plan (generate weekly task plan), both (schedule + tasks), query (custom request)"
        },
        query: {
          type: "string",
          description: "Custom query or additional context for the planner"
        }
      },
      required: ["week_start"]
    }
  },
  {
    name: "delegate_sports_events",
    description: "Delegate sports event management to a specialized sub-agent. Searches for upcoming football matches (La Liga, Champions League, Premier League, etc.), Formula 1, Tennis, UFC and other sports relevant to GrandCafe Cheers. Creates events in the restaurant calendar, avoids duplicates, and generates a visual HTML calendar artifact. RCD Mallorca matches are always prioritized as the local team.",
    input_schema: {
      type: "object",
      properties: {
        period: {
          type: "string",
          enum: ["this_week", "next_2_weeks", "this_month"],
          description: "Time period to search for events (default: this_week)"
        },
        sport: {
          type: "string",
          enum: ["all", "football", "f1", "tennis", "ufc", "moto_gp"],
          description: "Filter by sport (default: all)"
        },
        action: {
          type: "string",
          enum: ["sync", "calendar", "query"],
          description: "Action: sync (search+create), calendar (view only), query (custom search)"
        },
        query: {
          type: "string",
          description: "Custom query when action is 'query' (e.g. 'RCD Mallorca next 3 matches')"
        }
      },
      required: ["period"]
    }
  },

  // ============================================
  // BUSINESS RESOURCE TOOLS
  // ============================================

  {
    name: "get_training_guide",
    description: "Read the content of a specific training guide for staff. Returns the full guide content in the requested language. 74 guides across 6 categories: food_safety, occupational_health, labor_regulations, role_specific, required_docs, environmental.",
    input_schema: {
      type: "object",
      properties: {
        guide_code: {
          type: "string",
          description: "The guide code (e.g., 'G-FS-001', 'G-OH-005')"
        },
        language: {
          type: "string",
          enum: ["en", "es", "nl", "de"],
          description: "Language for the guide content (default: en)"
        }
      },
      required: ["guide_code"]
    }
  },
  {
    name: "get_training_compliance",
    description: "Get training compliance status. Shows which employees have completed mandatory training, pass rates, and overdue items. Can filter by employee or show team overview.",
    input_schema: {
      type: "object",
      properties: {
        employee_id: {
          type: "string",
          description: "Filter by specific employee UUID (optional)"
        },
        category: {
          type: "string",
          enum: ["food_safety", "occupational_health", "labor_regulations", "role_specific", "required_docs", "environmental"],
          description: "Filter by training category"
        }
      }
    }
  },
  {
    name: "get_task_templates",
    description: "List available task templates (operational checklists). Returns template name, items, frequency, and estimated minutes.",
    input_schema: {
      type: "object",
      properties: {
        frequency: {
          type: "string",
          enum: ["daily", "weekly", "monthly", "as_needed"],
          description: "Filter by frequency"
        }
      }
    }
  },
  {
    name: "get_overdue_tasks",
    description: "Get pending or overdue staff tasks. Can filter by employee, priority, or due date.",
    input_schema: {
      type: "object",
      properties: {
        employee_id: {
          type: "string",
          description: "Filter by specific employee"
        },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "urgent"],
          description: "Filter by priority"
        },
        status: {
          type: "string",
          enum: ["pending", "in_progress", "overdue"],
          description: "Filter by status"
        }
      }
    }
  },
  {
    name: "get_business_resource",
    description: "Access business brand resources: logo path, brand colors, address, phone, social media handles, tax form template paths.",
    input_schema: {
      type: "object",
      properties: {
        resource_type: {
          type: "string",
          enum: ["brand", "tax_forms", "training_categories", "schedule_shift_types"],
          description: "Type of resource to retrieve"
        }
      },
      required: ["resource_type"]
    }
  },
  {
    name: "generate_image",
    description: "Generate an image using AI for social media posts, menu visualization, event promos, or marketing materials. Returns a URL to the generated image. Brand context is automatically applied.",
    input_schema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "Description of the image to generate"
        },
        purpose: {
          type: "string",
          enum: ["social_post", "menu_item", "event_promo", "marketing", "general"],
          description: "Purpose of the image"
        },
        aspect_ratio: {
          type: "string",
          enum: ["1:1", "4:3", "16:9", "9:16"],
          description: "Image aspect ratio (default: 1:1)"
        },
        include_logo: {
          type: "boolean",
          description: "Overlay the GrandCafe Cheers logo on the generated image (bottom-right corner, semi-transparent). Defaults to true for social_post purpose, false otherwise. Always ask the user before enabling for non-social purposes."
        }
      },
      required: ["prompt", "purpose"]
    }
  },

  // ============================================
  // WRITE TOOLS — Business Resource Writes
  // ============================================

  {
    name: "create_task_from_template",
    description: "Create a new task assigned to an employee from an existing template. Requires confirmation.",
    input_schema: {
      type: "object",
      properties: {
        template_id: {
          type: "string",
          description: "UUID of the task template"
        },
        assignee_id: {
          type: "string",
          description: "UUID of the employee to assign to"
        },
        due_date: {
          type: "string",
          description: "Due date (YYYY-MM-DD)"
        },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "urgent"],
          description: "Task priority"
        }
      },
      required: ["template_id", "assignee_id"]
    }
  },

  // ============================================
  // EMPLOYEE / SCHEDULE / TASK TOOLS (NEW)
  // ============================================

  {
    name: "get_employees",
    description: "List employees with profile, role, contract type, hourly rate, and status. Can filter by role or status.",
    input_schema: {
      type: "object",
      properties: {
        role: {
          type: "string",
          description: "Filter by role (kitchen, bar, waiter, dj, manager)"
        },
        status: {
          type: "string",
          enum: ["active", "inactive", "all"],
          description: "Filter by employment status (default: active)"
        }
      }
    }
  },
  {
    name: "get_employee_details",
    description: "Get complete details for an employee: profile, contract, recent shifts, leave requests, and availability.",
    input_schema: {
      type: "object",
      properties: {
        employee_id: {
          type: "string",
          description: "UUID of the employee"
        }
      },
      required: ["employee_id"]
    }
  },
  {
    name: "get_leave_requests",
    description: "Get leave/vacation requests. Can filter by status, employee, or date range.",
    input_schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["pending", "approved", "rejected", "all"],
          description: "Filter by request status (default: all)"
        },
        employee_id: {
          type: "string",
          description: "Filter by specific employee"
        },
        date_from: {
          type: "string",
          description: "Start date filter (YYYY-MM-DD)"
        },
        date_to: {
          type: "string",
          description: "End date filter (YYYY-MM-DD)"
        }
      }
    }
  },
  {
    name: "get_employee_availability",
    description: "Get employee availability for a date range. Shows who is available, on leave, or has preferences set.",
    input_schema: {
      type: "object",
      properties: {
        date_from: {
          type: "string",
          description: "Start date (YYYY-MM-DD)"
        },
        date_to: {
          type: "string",
          description: "End date (YYYY-MM-DD)"
        },
        employee_id: {
          type: "string",
          description: "Filter by specific employee"
        }
      },
      required: ["date_from"]
    }
  },
  {
    name: "get_schedule_plans",
    description: "Get weekly schedule plans. Returns plan status, shifts count, and coverage summary.",
    input_schema: {
      type: "object",
      properties: {
        week_start: {
          type: "string",
          description: "Monday of the target week (YYYY-MM-DD)"
        },
        status: {
          type: "string",
          enum: ["draft", "published", "archived", "all"],
          description: "Filter by plan status"
        }
      }
    }
  },

  // ============================================
  // WRITE TOOLS — Employee / Schedule / Task (NEW)
  // ============================================

  {
    name: "create_task",
    description: "Create an ad-hoc task with optional checklist items. Assign to an employee with priority and due date. Requires confirmation.",
    input_schema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Task title"
        },
        description: {
          type: "string",
          description: "Task description"
        },
        assignee_id: {
          type: "string",
          description: "UUID of the employee to assign to"
        },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "urgent"],
          description: "Task priority (default: medium)"
        },
        due_date: {
          type: "string",
          description: "Due date (YYYY-MM-DD)"
        },
        checklist: {
          type: "array",
          items: { type: "string" },
          description: "Checklist items for the task"
        }
      },
      required: ["title", "assignee_id"]
    }
  },
  {
    name: "update_task_status",
    description: "Update a task's status, assignment, or priority. Requires confirmation.",
    input_schema: {
      type: "object",
      properties: {
        task_id: {
          type: "string",
          description: "UUID of the task"
        },
        status: {
          type: "string",
          enum: ["pending", "in_progress", "completed", "cancelled"],
          description: "New task status"
        },
        assignee_id: {
          type: "string",
          description: "New assignee UUID"
        },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "urgent"],
          description: "New priority"
        }
      },
      required: ["task_id"]
    }
  },
  {
    name: "create_leave_request",
    description: "Create a leave/vacation request for an employee. Requires confirmation.",
    input_schema: {
      type: "object",
      properties: {
        employee_id: {
          type: "string",
          description: "UUID of the employee"
        },
        start_date: {
          type: "string",
          description: "Leave start date (YYYY-MM-DD)"
        },
        end_date: {
          type: "string",
          description: "Leave end date (YYYY-MM-DD)"
        },
        leave_type: {
          type: "string",
          enum: ["vacation", "sick", "personal", "other"],
          description: "Type of leave (default: vacation)"
        },
        notes: {
          type: "string",
          description: "Additional notes"
        }
      },
      required: ["employee_id", "start_date", "end_date"]
    }
  },

  // ============================================
  // EXCEL EXPORT TOOL (NEW)
  // ============================================

  {
    name: "export_to_excel",
    description: "Generate an Excel file (schedule, tasks, sales, or expenses) and return a download URL. The file is stored temporarily for 1 hour.",
    input_schema: {
      type: "object",
      properties: {
        export_type: {
          type: "string",
          enum: ["schedule", "tasks", "sales", "expenses"],
          description: "Type of data to export"
        },
        date_from: {
          type: "string",
          description: "Start date (YYYY-MM-DD)"
        },
        date_to: {
          type: "string",
          description: "End date (YYYY-MM-DD)"
        }
      },
      required: ["export_type"]
    }
  },

  // ============================================
  // ADVERTISING & GIFT COUPON TOOLS
  // ============================================

  {
    name: "get_ads",
    description: "List advertisements with optional filters. Returns ad title, placement, template, status, multilingual content, and scheduling info.",
    input_schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["draft", "active", "paused", "completed", "archived"],
          description: "Filter by ad status"
        },
        placement: {
          type: "string",
          enum: ["social_media", "website_banner", "email", "print", "display"],
          description: "Filter by ad placement"
        },
        template: {
          type: "string",
          enum: ["event_promo", "menu_spotlight", "seasonal", "gift_coupon", "custom"],
          description: "Filter by ad template"
        }
      }
    }
  },
  {
    name: "get_coupons",
    description: "List gift coupons with optional filters. Returns coupon code, amount, status, purchaser/recipient info, and redemption details.",
    input_schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["active", "redeemed", "expired", "cancelled"],
          description: "Filter by coupon status"
        },
        search: {
          type: "string",
          description: "Search by coupon code or email address"
        }
      }
    }
  },
  {
    name: "delegate_advertising_manager",
    description: "Delegate advertisement creation to a specialized sub-agent. Creates multilingual ad copy (EN/NL/ES/DE) for various placements (social media, website, email, print). Generates HTML preview artifacts. Can create event promos, menu spotlights, seasonal campaigns, and gift coupon promotions.",
    input_schema: {
      type: "object",
      properties: {
        ad_type: {
          type: "string",
          enum: ["event_promo", "menu_spotlight", "seasonal", "gift_coupon", "custom"],
          description: "Type of advertisement to create"
        },
        placement: {
          type: "string",
          enum: ["social_media", "website_banner", "email", "print", "display"],
          description: "Where the ad will be placed (default: social_media)"
        },
        languages: {
          type: "array",
          items: { type: "string" },
          description: "Languages to generate: en, nl, es, de (default: en, nl)"
        },
        topic: {
          type: "string",
          description: "Specific topic, event, or product to advertise"
        }
      }
    }
  },

  {
    name: "delegate_cocktail_specialist",
    description: "Delegate cocktail/recipe tasks to the expert mixologist sub-agent. Can look up recipes with stock awareness, generate recipe card images, create social media posts with images, generate PDF recipe cards, and analyze the cocktail menu.",
    input_schema: {
      type: "object",
      properties: {
        task: {
          type: "string",
          enum: ["recipe_lookup", "stock_check", "missing_ingredients", "recipe_card_image", "social_media_post", "recipe_pdf", "menu_analysis", "custom"],
          description: "Type of cocktail task to perform"
        },
        cocktail_name: {
          type: "string",
          description: "Name of the cocktail (for recipe_lookup, stock_check, recipe_card_image, social_media_post, recipe_pdf)"
        },
        query: {
          type: "string",
          description: "Custom query for the cocktail specialist (when task=custom)"
        },
        language: {
          type: "string",
          enum: ["en", "nl", "es", "de"],
          description: "Preferred language for output (default: en)"
        }
      }
    }
  },

  {
    name: "delegate_compliance_auditor",
    description: "Delegate a compliance audit to a specialized sub-agent. Analyzes employee training compliance across categories (food safety, occupational health, labor regulations, etc.). Generates a traffic-light HTML report with compliance scores, gaps, and recommendations.",
    input_schema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["all", "food_safety", "occupational_health", "labor_regulations", "role_specific", "required_docs", "environmental"],
          description: "Training category to audit (default: all)"
        },
        employee_id: {
          type: "string",
          description: "Audit a specific employee (optional, default: all)"
        }
      }
    }
  },

  {
    name: "delegate_financial_reporter",
    description: "Delegate deep financial analysis to a specialized sub-agent. Generates P&L reports, COGS analysis, labor cost ratios, revenue trends, and branded HTML reports with chart artifacts.",
    input_schema: {
      type: "object",
      properties: {
        report_type: {
          type: "string",
          enum: ["pnl", "cogs", "labor", "revenue", "full"],
          description: "Type of financial report (default: full)"
        },
        period: {
          type: "string",
          enum: ["this_week", "this_month", "last_month", "this_quarter", "this_year", "custom"],
          description: "Time period for the report"
        },
        date_from: {
          type: "string",
          description: "Start date for custom period (YYYY-MM-DD)"
        },
        date_to: {
          type: "string",
          description: "End date for custom period (YYYY-MM-DD)"
        }
      }
    }
  },

  {
    name: "delegate_marketing_campaign",
    description: "Delegate marketing campaign creation to a specialized sub-agent. Creates multi-platform content (Instagram, Facebook) using real restaurant data (events, menu, reservations). Generates targeted posts with hashtags and CTAs.",
    input_schema: {
      type: "object",
      properties: {
        platform: {
          type: "string",
          enum: ["instagram", "facebook", "both"],
          description: "Target platform (default: both)"
        },
        campaign_type: {
          type: "string",
          enum: ["event_promo", "menu_spotlight", "seasonal", "general"],
          description: "Type of campaign"
        },
        context: {
          type: "string",
          description: "Additional context or specific requirements for the campaign"
        }
      }
    }
  },

  // WRITE TOOLS — Advertising & Coupons

  {
    name: "create_ad",
    description: "Create an advertisement with multilingual content. Requires title, placement, and at least English content. Requires confirmation.",
    input_schema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Ad campaign title"
        },
        placement: {
          type: "string",
          enum: ["social_media", "website_banner", "email", "print", "display"],
          description: "Ad placement type"
        },
        template: {
          type: "string",
          enum: ["event_promo", "menu_spotlight", "seasonal", "gift_coupon", "custom"],
          description: "Ad template type"
        },
        content_en: {
          type: "string",
          description: "Ad copy in English"
        },
        content_nl: {
          type: "string",
          description: "Ad copy in Dutch"
        },
        content_es: {
          type: "string",
          description: "Ad copy in Spanish"
        },
        content_de: {
          type: "string",
          description: "Ad copy in German"
        },
        cta_text: {
          type: "string",
          description: "Call to action text"
        },
        cta_url: {
          type: "string",
          description: "Call to action URL"
        },
        start_date: {
          type: "string",
          description: "Campaign start date (YYYY-MM-DD)"
        },
        end_date: {
          type: "string",
          description: "Campaign end date (YYYY-MM-DD)"
        },
        status: {
          type: "string",
          enum: ["draft", "active"],
          description: "Initial status (default: draft)"
        }
      },
      required: ["title", "placement", "content_en"]
    }
  },
  {
    name: "update_ad",
    description: "Update an existing advertisement's status, content, or scheduling. Requires confirmation.",
    input_schema: {
      type: "object",
      properties: {
        ad_id: {
          type: "string",
          description: "UUID of the advertisement to update"
        },
        status: {
          type: "string",
          enum: ["draft", "active", "paused", "completed", "archived"],
          description: "Updated status"
        },
        title: {
          type: "string",
          description: "Updated title"
        },
        content_en: {
          type: "string",
          description: "Updated English content"
        },
        content_nl: {
          type: "string",
          description: "Updated Dutch content"
        },
        content_es: {
          type: "string",
          description: "Updated Spanish content"
        },
        content_de: {
          type: "string",
          description: "Updated German content"
        },
        start_date: {
          type: "string",
          description: "Updated start date (YYYY-MM-DD)"
        },
        end_date: {
          type: "string",
          description: "Updated end date (YYYY-MM-DD)"
        }
      },
      required: ["ad_id"]
    }
  },
  {
    name: "validate_coupon",
    description: "Validate and redeem a gift coupon by its code. Checks if the coupon is active, not expired, and has remaining balance. Requires confirmation.",
    input_schema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "The coupon code to validate and redeem"
        },
        amount: {
          type: "number",
          description: "Amount to redeem in EUR (optional, defaults to full value)"
        }
      },
      required: ["code"]
    }
  },

  // ═══════════════════════════════════════════════════
  // WEEKLY TASK PLANNING TOOLS
  // ═══════════════════════════════════════════════════

  {
    name: "get_weekly_task_plan",
    description: "Get the weekly task plan for a specific week. Returns all planned tasks organized by day, with assignments and zones. Use for viewing, analyzing or reporting on task planning.",
    input_schema: {
      type: "object",
      properties: {
        week_start_date: {
          type: "string",
          description: "Monday date of the week (YYYY-MM-DD). Defaults to current week."
        }
      }
    }
  },
  {
    name: "get_zone_assignments",
    description: "Get zone/section assignments for a date and shift. Shows which employees are assigned to which floor sections (Terrace, Main Hall, Bar, etc.).",
    input_schema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Date (YYYY-MM-DD). Defaults to today."
        },
        shift_type: {
          type: "string",
          enum: ["morning", "afternoon", "night"],
          description: "Shift type filter"
        }
      }
    }
  },
  {
    name: "get_floor_sections",
    description: "Get all floor sections/zones of the restaurant with their tables. Returns section names, table counts, and positions.",
    input_schema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "create_planned_task",
    description: "Add a task to a weekly plan. Specify day of week (0=Monday to 6=Sunday), title, priority, and optionally assign to an employee or zone. Requires confirmation.",
    input_schema: {
      type: "object",
      properties: {
        week_start_date: {
          type: "string",
          description: "Monday date of the target week (YYYY-MM-DD)"
        },
        title: {
          type: "string",
          description: "Task title"
        },
        description: {
          type: "string",
          description: "Task description"
        },
        day_of_week: {
          type: "number",
          description: "Day of week: 0=Monday, 1=Tuesday, ... 6=Sunday"
        },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "urgent"],
          description: "Task priority"
        },
        shift_type: {
          type: "string",
          enum: ["morning", "afternoon", "night"],
          description: "Shift when the task should be done"
        },
        assigned_to: {
          type: "string",
          description: "Employee ID to assign the task to"
        },
        assigned_role: {
          type: "string",
          description: "Role to assign (waiter, bar, kitchen, manager)"
        },
        estimated_minutes: {
          type: "number",
          description: "Estimated time in minutes"
        },
        section_id: {
          type: "string",
          description: "Floor section/zone UUID"
        }
      },
      required: ["week_start_date", "title", "day_of_week"]
    }
  },
  {
    name: "update_planned_task",
    description: "Update an existing planned task in a weekly plan. Can change title, assignment, priority, day, status, etc. Requires confirmation.",
    input_schema: {
      type: "object",
      properties: {
        task_id: {
          type: "string",
          description: "The planned task UUID to update"
        },
        title: { type: "string" },
        description: { type: "string" },
        day_of_week: { type: "number" },
        priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
        shift_type: { type: "string", enum: ["morning", "afternoon", "night"] },
        assigned_to: { type: "string" },
        assigned_role: { type: "string" },
        estimated_minutes: { type: "number" },
        section_id: { type: "string" },
        status: { type: "string", enum: ["pending", "in_progress", "completed", "skipped"] }
      },
      required: ["task_id"]
    }
  },
  {
    name: "assign_zone",
    description: "Assign an employee to a floor zone/section for a specific date and shift. Requires confirmation.",
    input_schema: {
      type: "object",
      properties: {
        section_id: {
          type: "string",
          description: "Floor section UUID"
        },
        employee_id: {
          type: "string",
          description: "Employee UUID"
        },
        date: {
          type: "string",
          description: "Assignment date (YYYY-MM-DD)"
        },
        shift_type: {
          type: "string",
          enum: ["morning", "afternoon", "night"],
          description: "Shift for the assignment"
        },
        notes: {
          type: "string",
          description: "Optional notes"
        }
      },
      required: ["section_id", "employee_id", "date", "shift_type"]
    }
  },
  {
    name: "export_task_plan",
    description: "Export a weekly task plan as an Excel file. Returns a download URL. Use when user asks for a task plan export or download.",
    input_schema: {
      type: "object",
      properties: {
        week_start_date: {
          type: "string",
          description: "Monday date of the week (YYYY-MM-DD)"
        },
        format: {
          type: "string",
          enum: ["excel"],
          description: "Export format"
        }
      },
      required: ["week_start_date"]
    }
  },
]
