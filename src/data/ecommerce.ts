import { DatabasePreset } from '@/types';

export const ecommerceDatabase: DatabasePreset = {
  id: 'ecommerce',
  name: 'E-commerce Database',
  description: 'Customers, products, orders, and order items',
  schema: {
    tables: [
      {
        name: 'customers',
        columns: [
          { name: 'customer_id', type: 'INTEGER', constraints: ['PRIMARY KEY'] },
          { name: 'name', type: 'TEXT', constraints: ['NOT NULL'] },
          { name: 'email', type: 'TEXT', constraints: ['NOT NULL', 'UNIQUE'] },
          { name: 'city', type: 'TEXT', constraints: ['NOT NULL'] },
          { name: 'signup_date', type: 'TEXT', constraints: ['NOT NULL'] }
        ]
      },
      {
        name: 'products',
        columns: [
          { name: 'product_id', type: 'INTEGER', constraints: ['PRIMARY KEY'] },
          { name: 'name', type: 'TEXT', constraints: ['NOT NULL'] },
          { name: 'category', type: 'TEXT', constraints: ['NOT NULL'] },
          { name: 'price', type: 'REAL', constraints: ['NOT NULL'] },
          { name: 'stock', type: 'INTEGER', constraints: ['NOT NULL'] }
        ]
      },
      {
        name: 'orders',
        columns: [
          { name: 'order_id', type: 'INTEGER', constraints: ['PRIMARY KEY'] },
          { name: 'customer_id', type: 'INTEGER', constraints: ['REFERENCES customers(customer_id)'] },
          { name: 'order_date', type: 'TEXT', constraints: ['NOT NULL'] },
          { name: 'total', type: 'REAL', constraints: ['NOT NULL'] },
          { name: 'status', type: 'TEXT', constraints: ['NOT NULL'] }
        ]
      },
      {
        name: 'order_items',
        columns: [
          { name: 'item_id', type: 'INTEGER', constraints: ['PRIMARY KEY'] },
          { name: 'order_id', type: 'INTEGER', constraints: ['REFERENCES orders(order_id)'] },
          { name: 'product_id', type: 'INTEGER', constraints: ['REFERENCES products(product_id)'] },
          { name: 'quantity', type: 'INTEGER', constraints: ['NOT NULL'] },
          { name: 'price', type: 'REAL', constraints: ['NOT NULL'] }
        ]
      }
    ]
  },
  seedData: {
    customers: [
      [1, 'John Smith', 'john.smith@email.com', 'New York', '2023-01-15'],
      [2, 'Emily Davis', 'emily.davis@email.com', 'Los Angeles', '2023-02-20'],
      [3, 'Michael Brown', 'michael.brown@email.com', 'Chicago', '2023-03-10'],
      [4, 'Sarah Wilson', 'sarah.wilson@email.com', 'Houston', '2023-03-25'],
      [5, 'David Martinez', 'david.martinez@email.com', 'Phoenix', '2023-04-05'],
      [6, 'Jessica Taylor', 'jessica.taylor@email.com', 'Philadelphia', '2023-04-18'],
      [7, 'Christopher Anderson', 'chris.anderson@email.com', 'San Antonio', '2023-05-02'],
      [8, 'Amanda Thomas', 'amanda.thomas@email.com', 'San Diego', '2023-05-15'],
      [9, 'Daniel Jackson', 'daniel.jackson@email.com', 'Dallas', '2023-06-01'],
      [10, 'Ashley White', 'ashley.white@email.com', 'San Jose', '2023-06-20'],
      [11, 'Matthew Harris', 'matt.harris@email.com', 'Austin', '2023-07-08'],
      [12, 'Jennifer Clark', 'jennifer.clark@email.com', 'Jacksonville', '2023-07-22'],
      [13, 'Joshua Lewis', 'joshua.lewis@email.com', 'Fort Worth', '2023-08-05'],
      [14, 'Stephanie Robinson', 'stephanie.r@email.com', 'Columbus', '2023-08-18'],
      [15, 'Andrew Walker', 'andrew.walker@email.com', 'Charlotte', '2023-09-01'],
      [16, 'Nicole Hall', 'nicole.hall@email.com', 'Seattle', '2023-09-15'],
      [17, 'Ryan Young', 'ryan.young@email.com', 'Denver', '2023-10-02'],
      [18, 'Megan King', 'megan.king@email.com', 'Boston', '2023-10-20'],
      [19, 'Brandon Wright', 'brandon.wright@email.com', 'Detroit', '2023-11-05'],
      [20, 'Lauren Scott', 'lauren.scott@email.com', 'Portland', '2023-11-18']
    ],
    products: [
      [1, 'Wireless Bluetooth Headphones', 'Electronics', 79.99, 150],
      [2, 'Smartphone Case', 'Electronics', 19.99, 500],
      [3, 'USB-C Charging Cable', 'Electronics', 12.99, 800],
      [4, 'Portable Power Bank', 'Electronics', 34.99, 200],
      [5, 'Casual Cotton T-Shirt', 'Clothing', 24.99, 300],
      [6, 'Denim Jeans', 'Clothing', 49.99, 180],
      [7, 'Running Sneakers', 'Clothing', 89.99, 120],
      [8, 'Winter Jacket', 'Clothing', 129.99, 75],
      [9, 'JavaScript: The Good Parts', 'Books', 29.99, 100],
      [10, 'Clean Code', 'Books', 39.99, 85],
      [11, 'The Pragmatic Programmer', 'Books', 44.99, 60],
      [12, 'Coffee Maker', 'Home', 59.99, 90],
      [13, 'Desk Lamp', 'Home', 29.99, 150],
      [14, 'Yoga Mat', 'Sports', 24.99, 200],
      [15, 'Dumbbells Set', 'Sports', 79.99, 80]
    ],
    orders: [
      [1, 1, '2023-06-15', 114.97, 'Delivered'],
      [2, 1, '2023-08-20', 79.99, 'Delivered'],
      [3, 2, '2023-07-10', 159.97, 'Delivered'],
      [4, 3, '2023-07-25', 69.98, 'Delivered'],
      [5, 3, '2023-09-05', 129.99, 'Delivered'],
      [6, 4, '2023-08-01', 94.98, 'Delivered'],
      [7, 5, '2023-08-15', 189.97, 'Delivered'],
      [8, 6, '2023-08-28', 44.98, 'Delivered'],
      [9, 7, '2023-09-10', 79.99, 'Delivered'],
      [10, 8, '2023-09-18', 139.98, 'Delivered'],
      [11, 9, '2023-09-25', 84.98, 'Delivered'],
      [12, 10, '2023-10-02', 59.99, 'Delivered'],
      [13, 11, '2023-10-10', 229.97, 'Delivered'],
      [14, 12, '2023-10-15', 74.98, 'Shipped'],
      [15, 13, '2023-10-20', 169.98, 'Shipped'],
      [16, 14, '2023-10-25', 54.98, 'Shipped'],
      [17, 15, '2023-10-28', 119.98, 'Pending'],
      [18, 16, '2023-11-01', 89.99, 'Pending'],
      [19, 17, '2023-11-05', 44.99, 'Pending'],
      [20, 18, '2023-11-08', 199.97, 'Pending'],
      [21, 19, '2023-11-10', 64.98, 'Cancelled'],
      [22, 20, '2023-11-12', 109.98, 'Pending'],
      [23, 1, '2023-11-14', 84.98, 'Pending'],
      [24, 2, '2023-11-15', 49.99, 'Pending'],
      [25, 3, '2023-11-16', 159.98, 'Pending'],
      [26, 4, '2023-11-17', 39.99, 'Pending'],
      [27, 5, '2023-11-18', 79.99, 'Cancelled'],
      [28, 6, '2023-11-19', 129.99, 'Pending'],
      [29, 7, '2023-11-20', 54.98, 'Pending'],
      [30, 8, '2023-11-21', 89.98, 'Pending'],
      [31, 9, '2023-11-22', 144.97, 'Pending'],
      [32, 10, '2023-11-23', 69.98, 'Pending']
    ],
    order_items: [
      [1, 1, 1, 1, 79.99],
      [2, 1, 3, 1, 12.99],
      [3, 1, 2, 1, 19.99],
      [4, 2, 1, 1, 79.99],
      [5, 3, 7, 1, 89.99],
      [6, 3, 5, 2, 49.98],
      [7, 3, 2, 1, 19.99],
      [8, 4, 9, 1, 29.99],
      [9, 4, 10, 1, 39.99],
      [10, 5, 8, 1, 129.99],
      [11, 6, 4, 2, 69.98],
      [12, 6, 14, 1, 24.99],
      [13, 7, 8, 1, 129.99],
      [14, 7, 12, 1, 59.99],
      [15, 8, 5, 1, 24.99],
      [16, 8, 2, 1, 19.99],
      [17, 9, 15, 1, 79.99],
      [18, 10, 6, 2, 99.98],
      [19, 10, 10, 1, 39.99],
      [20, 11, 11, 1, 44.99],
      [21, 11, 10, 1, 39.99],
      [22, 12, 12, 1, 59.99],
      [23, 13, 7, 2, 179.98],
      [24, 13, 6, 1, 49.99],
      [25, 14, 5, 2, 49.98],
      [26, 14, 14, 1, 24.99],
      [27, 15, 1, 1, 79.99],
      [28, 15, 7, 1, 89.99],
      [29, 16, 9, 1, 29.99],
      [30, 16, 14, 1, 24.99],
      [31, 17, 4, 2, 69.98],
      [32, 17, 6, 1, 49.99],
      [33, 18, 7, 1, 89.99],
      [34, 19, 11, 1, 44.99],
      [35, 20, 8, 1, 129.99],
      [36, 20, 9, 1, 29.99],
      [37, 20, 10, 1, 39.99],
      [38, 21, 3, 3, 38.97],
      [39, 21, 2, 1, 19.99],
      [40, 22, 1, 1, 79.99],
      [41, 22, 13, 1, 29.99],
      [42, 23, 10, 1, 39.99],
      [43, 23, 11, 1, 44.99],
      [44, 24, 6, 1, 49.99],
      [45, 25, 15, 2, 159.98],
      [46, 26, 10, 1, 39.99],
      [47, 27, 1, 1, 79.99],
      [48, 28, 8, 1, 129.99],
      [49, 29, 9, 1, 29.99],
      [50, 29, 14, 1, 24.99],
      [51, 30, 5, 2, 49.98],
      [52, 30, 10, 1, 39.99],
      [53, 31, 12, 1, 59.99],
      [54, 31, 9, 1, 29.99],
      [55, 31, 11, 1, 44.99],
      [56, 31, 3, 1, 12.99],
      [57, 32, 4, 1, 34.99],
      [58, 32, 3, 2, 25.98],
      [59, 32, 2, 1, 19.99],
      [60, 1, 5, 1, 24.99],
      [61, 3, 3, 1, 12.99],
      [62, 7, 5, 1, 24.99],
      [63, 10, 3, 1, 12.99],
      [64, 13, 3, 2, 25.98]
    ]
  },
  exampleQueries: [
    // BASIC QUERIES (5)
    {
      category: 'Basic',
      title: 'All Customers',
      description: 'Select all customers from the database',
      sql: 'SELECT * FROM customers;'
    },
    {
      category: 'Basic',
      title: 'Electronics Products',
      description: 'Filter products by Electronics category',
      sql: "SELECT name, price, stock FROM products WHERE category = 'Electronics';"
    },
    {
      category: 'Basic',
      title: 'Pending Orders',
      description: 'Find all orders with Pending status',
      sql: "SELECT order_id, customer_id, order_date, total FROM orders WHERE status = 'Pending' ORDER BY order_date;"
    },
    {
      category: 'Basic',
      title: 'Expensive Products',
      description: 'Products priced above $50',
      sql: 'SELECT name, category, price FROM products WHERE price > 50 ORDER BY price DESC;'
    },
    {
      category: 'Basic',
      title: 'Low Stock Items',
      description: 'Products with stock below 100',
      sql: 'SELECT name, category, stock FROM products WHERE stock < 100 ORDER BY stock;'
    },

    // JOIN QUERIES (4)
    {
      category: 'Joins',
      title: 'Orders with Customers',
      description: 'Join orders with customer information',
      sql: `SELECT o.order_id, c.name AS customer_name, c.city, o.order_date, o.total, o.status
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
ORDER BY o.order_date DESC;`
    },
    {
      category: 'Joins',
      title: 'Order Items Details',
      description: 'Show order items with product information',
      sql: `SELECT oi.order_id, p.name AS product_name, p.category, oi.quantity, oi.price
FROM order_items oi
JOIN products p ON oi.product_id = p.product_id
ORDER BY oi.order_id, p.name;`
    },
    {
      category: 'Joins',
      title: 'Full Order Details',
      description: 'Complete order information with customer and items',
      sql: `SELECT c.name AS customer, o.order_date, p.name AS product, oi.quantity, oi.price, o.status
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
JOIN order_items oi ON o.order_id = oi.order_id
JOIN products p ON oi.product_id = p.product_id
ORDER BY o.order_date DESC, c.name;`
    },
    {
      category: 'Joins',
      title: 'Customer Order Summary',
      description: 'Customers with their order counts and totals',
      sql: `SELECT c.name, c.city, COUNT(o.order_id) AS order_count, ROUND(SUM(o.total), 2) AS total_spent
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id
GROUP BY c.customer_id, c.name, c.city
ORDER BY total_spent DESC;`
    },

    // AGGREGATION QUERIES (4)
    {
      category: 'Aggregation',
      title: 'Sales by Category',
      description: 'Total sales revenue per product category',
      sql: `SELECT p.category, COUNT(oi.item_id) AS items_sold, ROUND(SUM(oi.price * oi.quantity), 2) AS total_revenue
FROM products p
JOIN order_items oi ON p.product_id = oi.product_id
GROUP BY p.category
ORDER BY total_revenue DESC;`
    },
    {
      category: 'Aggregation',
      title: 'Monthly Sales',
      description: 'Order totals grouped by month',
      sql: `SELECT strftime('%Y-%m', order_date) AS month, COUNT(*) AS order_count, ROUND(SUM(total), 2) AS monthly_total
FROM orders
WHERE status != 'Cancelled'
GROUP BY strftime('%Y-%m', order_date)
ORDER BY month;`
    },
    {
      category: 'Aggregation',
      title: 'Order Status Summary',
      description: 'Count and total for each order status',
      sql: `SELECT status, COUNT(*) AS order_count, ROUND(SUM(total), 2) AS total_value
FROM orders
GROUP BY status
ORDER BY order_count DESC;`
    },
    {
      category: 'Aggregation',
      title: 'Top Selling Products',
      description: 'Products ranked by quantity sold',
      sql: `SELECT p.name, p.category, SUM(oi.quantity) AS total_sold, ROUND(SUM(oi.price), 2) AS revenue
FROM products p
JOIN order_items oi ON p.product_id = oi.product_id
GROUP BY p.product_id, p.name, p.category
ORDER BY total_sold DESC
LIMIT 10;`
    },

    // SUBQUERY QUERIES (3)
    {
      category: 'Subqueries',
      title: 'Above Average Orders',
      description: 'Orders with total above the average order value',
      sql: `SELECT order_id, customer_id, total, order_date
FROM orders
WHERE total > (SELECT AVG(total) FROM orders)
ORDER BY total DESC;`
    },
    {
      category: 'Subqueries',
      title: 'Customers with Multiple Orders',
      description: 'Customers who have placed more than one order',
      sql: `SELECT name, email, city
FROM customers
WHERE customer_id IN (
  SELECT customer_id
  FROM orders
  GROUP BY customer_id
  HAVING COUNT(*) > 1
)
ORDER BY name;`
    },
    {
      category: 'Subqueries',
      title: 'Best Selling Product per Category',
      description: 'Find the top selling product in each category',
      sql: `SELECT p.name, p.category, SUM(oi.quantity) AS total_sold
FROM products p
JOIN order_items oi ON p.product_id = oi.product_id
GROUP BY p.product_id, p.name, p.category
HAVING SUM(oi.quantity) = (
  SELECT MAX(qty)
  FROM (
    SELECT p2.category AS cat, SUM(oi2.quantity) AS qty
    FROM products p2
    JOIN order_items oi2 ON p2.product_id = oi2.product_id
    WHERE p2.category = p.category
    GROUP BY p2.product_id
  )
)
ORDER BY p.category;`
    },

    // ADVANCED QUERIES (3)
    {
      category: 'Advanced',
      title: 'Customer Lifetime Value',
      description: 'Comprehensive customer analysis with multiple metrics',
      sql: `SELECT
  c.name,
  c.city,
  c.signup_date,
  COUNT(DISTINCT o.order_id) AS total_orders,
  ROUND(SUM(o.total), 2) AS lifetime_value,
  ROUND(AVG(o.total), 2) AS avg_order_value,
  MAX(o.order_date) AS last_order
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id AND o.status != 'Cancelled'
GROUP BY c.customer_id, c.name, c.city, c.signup_date
ORDER BY lifetime_value DESC;`
    },
    {
      category: 'Advanced',
      title: 'Product Performance Analysis',
      description: 'Detailed product metrics including revenue and stock',
      sql: `SELECT
  p.name,
  p.category,
  p.price AS unit_price,
  p.stock AS current_stock,
  COALESCE(SUM(oi.quantity), 0) AS units_sold,
  COALESCE(ROUND(SUM(oi.price), 2), 0) AS total_revenue,
  CASE
    WHEN p.stock < 50 THEN 'Low Stock'
    WHEN p.stock < 150 THEN 'Medium Stock'
    ELSE 'Well Stocked'
  END AS stock_status
FROM products p
LEFT JOIN order_items oi ON p.product_id = oi.product_id
GROUP BY p.product_id, p.name, p.category, p.price, p.stock
ORDER BY total_revenue DESC;`
    },
    {
      category: 'Advanced',
      title: 'City Sales Analysis',
      description: 'Sales breakdown by customer city',
      sql: `SELECT
  c.city,
  COUNT(DISTINCT c.customer_id) AS customers,
  COUNT(DISTINCT o.order_id) AS orders,
  ROUND(SUM(o.total), 2) AS total_revenue,
  ROUND(AVG(o.total), 2) AS avg_order,
  SUM(CASE WHEN o.status = 'Delivered' THEN 1 ELSE 0 END) AS delivered,
  SUM(CASE WHEN o.status = 'Pending' THEN 1 ELSE 0 END) AS pending
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id
GROUP BY c.city
ORDER BY total_revenue DESC;`
    }
  ]
};
