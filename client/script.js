document.addEventListener("DOMContentLoaded", () => {
    // Defining element selectors
    const loginBtn = document.getElementById("loginBtn");
    const registerBtn = document.getElementById("registerBtn");
    const viewInventoryBtn = document.getElementById("viewInventoryBtn");
    const addItemBtn = document.getElementById("addItemBtn");
    const updateItemBtn = document.getElementById("updateItemBtn");
    const viewUsersBtn = document.getElementById("viewUsersBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const addItemForm = document.getElementById("addItemForm");
    const updateItemForm = document.getElementById("updateItemForm");
    const updateUserForm = document.getElementById("updateUserForm");
    const usernameDisplay = document.getElementById("usernameDisplay");
    const userSection = document.getElementById("userSection");
    const userTable = document.getElementById("userTable");

    const loginSection = document.getElementById("loginSection");
    const registerSection = document.getElementById("registerSection");
    const inventorySection = document.getElementById("inventorySection");
    const addItemSection = document.getElementById("addItemSection");
    const updateItemSection = document.getElementById("updateItemSection");
    const updateUserSection = document.getElementById("updateUserSection");

    let token = localStorage.getItem('token');
    let userRole = localStorage.getItem('userRole');
    let username = localStorage.getItem('username');

    // Helper function to hide all sections
    function hideAllSections() {
        const sections = document.querySelectorAll('section');
        sections.forEach(section => section.classList.add('hidden'));
    }

    // Helper function to show username in the header if logged in
    function updateHeaderUI() {
        if (username) {
            usernameDisplay.innerText = `Logged in as: ${username}`;
            logoutBtn.classList.remove("hidden");
        } else {
            usernameDisplay.innerText = "";
            logoutBtn.classList.add("hidden");
        }
    }

    /* ====================== Item - Inventory Section ====================== */

    // Event listener for view inventory button
    if (viewInventoryBtn) {
        viewInventoryBtn.addEventListener("click", () => {
            if (!token) {
                alert("Please log in first.");
                hideAllSections();
                loginSection.classList.remove("hidden");
                return;
            }
            fetchInventory();
        });
    }

    // Event listener for update item button (admin only)
    if (updateItemBtn) {
        updateItemBtn.addEventListener("click", () => {
            if (!token || userRole !== "admin") {
                alert("Not authorized. Please log in as an admin.");
                hideAllSections();
                loginSection.classList.remove("hidden");
                return;
            }
            hideAllSections();
            updateItemSection.classList.remove("hidden");
        });
    }

    // Event listener for add item button (admin only)
    if (addItemBtn) {
        addItemBtn.addEventListener("click", () => {
            if (!token || userRole !== "admin") {
                alert("Not authorized. Please log in as an admin.");
                hideAllSections();
                loginSection.classList.remove("hidden");
                return;
            }
            hideAllSections();
            addItemSection.classList.remove("hidden");
        });
    }

    // Fill update form with item data
    function fillUpdateForm(item) {
        document.getElementById("updateItemNumber").value = item.id; 
        document.getElementById("updateItemName").value = item.name;
        document.getElementById("updateItemDescription").value = item.description;
        document.getElementById("updateItemQuantity").value = item.quantity;
    }

    // Handle add item form submission
    if (addItemForm) {
        addItemForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const name = document.getElementById("itemName").value;
            const description = document.getElementById("itemDescription").value;
            const quantity = parseInt(document.getElementById("itemQuantity").value);

            fetch("http://localhost:3000/inventory", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({ name, quantity, description }),
            })
                .then((response) => response.json())
                .then((data) => {
                    if (data.item) {
                        alert("Item added successfully!");
                        fetchInventory();  // Fetch inventory immediately after adding the item
                    } else {
                        alert(data.error || "Failed to add item.");
                    }
                })
                .catch((error) => {
                    console.error("Error adding item:", error);
                });
        });
    }

    // Function to fetch a single inventory item by ID
    async function fetchItemById(itemId) {
        try {
            const response = await fetch(`http://localhost:3000/inventory/${itemId}`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
            });

            console.log('Response from server:', response); // Debugging line

            if (!response.ok) {
                if (response.status === 404) {
                    console.error(`Item with ID ${itemId} not found.`);
                    return null; // Explicitly return null for not found
                }
                throw new Error('Failed to fetch item due to server error');
            }

            const item = await response.json();
            return item;

        } catch (error) {
            console.error("Error fetching item:", error);
            return null; // Only return null if item was truly not found
        }
    }


    // Handle update item form submission
    if (updateItemForm) {
        updateItemForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            let id = document.getElementById("updateItemNumber").value;
            id = parseInt(id, 10);

            if (isNaN(id)) {
                alert("Invalid item number. Please enter a valid number.");
                return;
            }

            const name = document.getElementById("updateItemName").value;
            const description = document.getElementById("updateItemDescription").value;
            const quantity = parseInt(document.getElementById("updateItemQuantity").value);

            try {
                // Check if item exists first
                const item = await fetchItemById(id);
                
                // Debugging log
                console.log('Fetched item:', item);

                if (item === null) {
                    alert("Item not found. Please check the item number.");
                    return;
                }

                // If item is found, proceed with the update
                const response = await fetch(`http://localhost:3000/inventory/${id}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                    body: JSON.stringify({ name, quantity, description }),
                });

                const data = await response.json();
                console.log('Update response data:', data); // Debugging line

                if (response.ok) {
                    alert("Item updated successfully!");
                    fetchInventory();  // Fetch inventory after updating
                } else {
                    alert(data.error || "Failed to update item.");
                }
            } catch (error) {
                console.error("Error during update process:", error);
                alert("Error: Unable to update item. Please try again.");
            }
        });
    }

    // Fetch inventory items
    function fetchInventory() {
        fetch("http://localhost:3000/inventory", {
            headers: {
                "Authorization": `Bearer ${token}`, // Corrected syntax here
            },
        })
        .then((response) => response.json())
        .then((data) => {
            const inventoryTable = document.getElementById("inventoryTable").getElementsByTagName("tbody")[0];
            inventoryTable.innerHTML = ""; // Clear previous content

            data.forEach((item) => {
                const row = inventoryTable.insertRow();
                row.insertCell(0).innerText = item.id;
                row.insertCell(1).innerText = item.name;
                row.insertCell(2).innerText = item.description;
                row.insertCell(3).innerText = item.quantity;

                // Add action buttons for admin users
                if (userRole === "admin") {
                    const actionsCell = row.insertCell(4);
                    
                    // Create Delete Button
                    const deleteBtn = document.createElement("button");
                    deleteBtn.innerText = "Delete";
                    deleteBtn.classList.add("deleteBtn");
                    deleteBtn.addEventListener("click", () => {
                        // Confirm before deleting
                        if (confirm("Are you sure you want to delete this item?")) {
                            deleteItem(item.id);
                        }
                    });
                    
                    // Create Update Button
                    const updateBtn = document.createElement("button");
                    updateBtn.innerText = "Update";
                    updateBtn.classList.add("updateBtn");
                    updateBtn.addEventListener("click", () => {
                        // Pre-fill the update form with item data and navigate to update item section
                        fillUpdateForm(item);
                        hideAllSections();
                        updateItemSection.classList.remove("hidden");
                    });

                    // Append buttons to actionsCell
                    actionsCell.appendChild(deleteBtn);
                    actionsCell.appendChild(updateBtn);
                }
            });

            hideAllSections();
            inventorySection.classList.remove("hidden");
        })
        .catch((error) => {
            console.error("Error fetching inventory:", error);
        });
    }

    // Delete item function
    function deleteItem(itemId) {
        fetch(`http://localhost:3000/inventory/${itemId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`,
            },
        })
        .then((response) => response.json())
        .then((data) => {
            if (data.message) {
                alert("Item deleted successfully!");
                fetchInventory();  // Refresh inventory after deletion
            } else {
                alert(data.error || "Failed to delete item.");
            }
        })
        .catch((error) => {
            console.error("Error deleting item:", error);
        });
    }

    /* ================== User logic ====================== */

    // Event listener for view users button (admin only)
    if (viewUsersBtn) {
        viewUsersBtn.addEventListener("click", () => {
            if (!token || userRole !== "admin") {
                alert("Not authorized. Please log in as an admin.");
                hideAllSections();
                loginSection.classList.remove("hidden");
                return;
            }
            fetchUsers();
        });
    }

    // Event listener for login button
    if (loginBtn) {
        loginBtn.addEventListener("click", () => {
            hideAllSections();
            loginSection.classList.remove("hidden");
        });
    }

    // Event listener for register button
    if (registerBtn) {
        registerBtn.addEventListener("click", () => {
            hideAllSections();
            registerSection.classList.remove("hidden");
        });
    }

    // Event listener for logout button
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem('token');
            localStorage.removeItem('userRole');
            localStorage.removeItem('username');
            token = null;
            userRole = null;
            username = null;
            updateHeaderUI();
            hideAllSections();
            loginSection.classList.remove("hidden");
        });
    }

    // Handle login form submission
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const usernameInput = document.getElementById("username").value;
            const password = document.getElementById("password").value;

            fetch("http://localhost:3000/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username: usernameInput, password }),
            })
                .then((response) => response.json())
                .then((data) => {
                    if (data.token) {
                        token = data.token;
                        userRole = data.role;
                        username = usernameInput;
                        localStorage.setItem('token', token);
                        localStorage.setItem('userRole', userRole);
                        localStorage.setItem('username', username);
                        alert("Login successful!");
                        hideAllSections();
                        inventorySection.classList.remove("hidden");
                        updateHeaderUI(); // Update header after login
                    } else {
                        alert(data.error || "Login failed. Please try again.");
                    }
                })
                .catch((error) => {
                    console.error("Error during login:", error);
                });
        });
    }

    // Handle register form submission
    if (registerForm) {
        registerForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const username = document.getElementById("registerUsername").value;
            const password = document.getElementById("registerPassword").value;
            const role = document.getElementById("registerRole").value;

            fetch("http://localhost:3000/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username, password, role }),
            })
                .then((response) => response.json())
                .then((data) => {
                    if (data.userId) {
                        alert("Registration successful! Please log in.");
                        hideAllSections();
                        loginSection.classList.remove("hidden");
                    } else {
                        alert(data.error || "Registration failed. Please try again.");
                    }
                })
                .catch((error) => {
                    console.error("Error during registration:", error);
                });
        });
    }

    // Fetch users for admin
    function fetchUsers() {
        fetch("http://localhost:3000/users", {
            headers: {
                "Authorization": `Bearer ${token}`,
            },
        })
        .then((response) => response.json())
        .then((data) => {
            const userTableBody = userTable.getElementsByTagName("tbody")[0];
            userTableBody.innerHTML = ""; // Clear previous content

            data.forEach((user) => {
                const row = userTableBody.insertRow();
                row.insertCell(0).innerText = user.id;
                
                // Username cell - editable
                const usernameCell = row.insertCell(1);
                const usernameInput = document.createElement("input");
                usernameInput.type = "text";
                usernameInput.value = user.username;
                usernameInput.disabled = true; // Initially not editable
                usernameCell.appendChild(usernameInput);

                // Full Name cell - editable
                const fullNameCell = row.insertCell(2);
                const fullNameInput = document.createElement("input");
                fullNameInput.type = "text";
                fullNameInput.value = user.fullName || '';
                fullNameInput.disabled = true; // Initially not editable
                fullNameCell.appendChild(fullNameInput);

                // Email cell - editable
                const emailCell = row.insertCell(3);
                const emailInput = document.createElement("input");
                emailInput.type = "text";
                emailInput.value = user.email || '';
                emailInput.disabled = true; // Initially not editable
                emailCell.appendChild(emailInput);

                // Role cell - editable
                const roleCell = row.insertCell(4);
                const roleInput = document.createElement("input");
                roleInput.type = "text";
                roleInput.value = user.role;
                roleInput.disabled = true; // Initially not editable
                roleCell.appendChild(roleInput);

                // Actions cell
                const actionsCell = row.insertCell(5);

                // Create Update Button
                const updateBtn = document.createElement("button");
                updateBtn.innerText = "Update";
                updateBtn.classList.add("updateBtn");
                updateBtn.addEventListener("click", () => {
                    // Enable editing of fields
                    usernameInput.disabled = false;
                    fullNameInput.disabled = false;
                    emailInput.disabled = false;
                    roleInput.disabled = false;

                    // Change Update button to Submit button
                    updateBtn.innerText = "Submit";
                    updateBtn.classList.remove("updateBtn");
                    updateBtn.classList.add("submitBtn");

                    updateBtn.addEventListener("click", () => {
                        if (confirm("Are you sure you want to update this user?")) {
                            const updatedUser = {
                                id: user.id,
                                username: usernameInput.value,
                                fullName: fullNameInput.value,
                                email: emailInput.value,
                                role: roleInput.value
                            };
                            updateUser(updatedUser);
                        }
                    });
                });

                actionsCell.appendChild(updateBtn);

                // Create Delete Button
                const deleteBtn = document.createElement("button");
                deleteBtn.innerText = "Delete";
                deleteBtn.classList.add("deleteBtn");
                deleteBtn.addEventListener("click", () => {
                    if (confirm("Are you sure you want to delete this user?")) {
                        deleteUser(user.id);
                    }
                });

                actionsCell.appendChild(deleteBtn);
            });

            hideAllSections();
            userSection.classList.remove("hidden");
        })
        .catch((error) => {
            console.error("Error fetching users:", error);
        });
    }

    // Update user function
    function updateUser(user) {
        fetch(`http://localhost:3000/users/${user.id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({
                username: user.username,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
            }),
        })
        .then((response) => response.json())
        .then((data) => {
            if (data.message) {
                alert("User updated successfully!");
                fetchUsers();  // Refresh user list after updating
            } else {
                alert(data.error || "Failed to update user.");
            }
        })
        .catch((error) => {
            console.error("Error updating user:", error);
        });
    }

    // Delete user function
    function deleteUser(userId) {
        fetch(`http://localhost:3000/users/${userId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`,
            },
        })
        .then((response) => response.json())
        .then((data) => {
            if (data.message) {
                alert("User deleted successfully!");
                fetchUsers();  // Refresh user list after deletion
            } else {
                alert(data.error || "Failed to delete user.");
            }
        })
        .catch((error) => {
            console.error("Error deleting user:", error);
        });
    }

    /*======================================================= */

    // Initial UI update if already logged in
    if (token) {
        updateHeaderUI();
        fetchInventory();
    }
});
