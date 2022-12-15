const app = require("../api/index.js");
const request = require("supertest");
const agent = request.agent(app);
const sql_creds = require("../config/sql-credentials.json");
const passKey = sql_creds.password;

describe("index", () => {
    it("returns status code 200", async() => {
        const res = await agent.get("/");
        expect(res.statusCode).toEqual(200);
    })
})

describe("about", () => {
    it("returns status code 200", async() => {
        const res = await agent.get("/about");
        expect(res.statusCode).toEqual(200);
    })
})

describe("setsession", () => {
    it("invalid password returns status code 401", async() => {
        const res = await request(app).post("/setsession").send({
            passKey: "this is an invalid password"
        });
        expect(res.statusCode).toEqual(401);
    })
})

describe("setsession", () => {
    it("valid password, valid data returns status code 200", async() => {
        const res = await request(app).post("/setsession").send({
            passKey,
            data: {
                test: "abc"
            }
        });
        expect(res.statusCode).toEqual(200);
    })
})

describe("setsession", () => {
    it("valid password, destroy session returns status code 200", async() => {
        const res = await request(app).post("/setsession").send({
            passKey,
            destroy: true
        });
        expect(res.statusCode).toEqual(200);
    })
})

describe("storeUser", () => {
    it("returns status code 301 and the default forward location", async() => {
        const res = await agent.post("/storeUser").send({
            user: null
        });
        expect(res.statusCode).toEqual(301);
        expect(res.text).toEqual("/")
    })
})

describe("storeUser", () => {
    beforeEach(async () => {
        await agent.post("/setsession").send({
            passKey,
            data: {
                forward: "/test"
            }
        });
    });

    it("returns status code 301 and the stored forward location", async() => {
        const res = await agent.post("/storeUser").send({
            user: null
        });
        expect(res.statusCode).toEqual(301);
        expect(res.text).toEqual("/test")
    })
})

describe("admin", () => {
    beforeEach(async () => {
        await agent.post("/setsession").send({
            passKey,
            destroy: true
        });
    });

    it("not logged in, returns status code 302 redirects to /authwall", async() => {
        const res = await agent.get("/admin");
        expect(res.statusCode).toEqual(302);
        expect(res.header.location).toEqual("authwall");
    })
})

describe("admin", () => {
    beforeEach(async () => {
        await agent.post("/setsession").send({
            passKey,
            destroy: true,
        });

        await agent.post("/setsession").send({
            passKey,
            data: {
                loggedin: true,
                user: {
                    uid: "some non-admin ID"
                }
            }
        });
    });

    it("logged in as non-admin, returns status code 302 redirects to /", async() => {
        const res = await agent.get("/admin");
        expect(res.statusCode).toEqual(302);
        expect(res.header.location).toEqual("/");
    })
})

describe("admin", () => {
    beforeEach(async () => {
        await agent.post("/setsession").send({
            passKey,
            destroy: true,
        });

        await agent.post("/setsession").send({
            passKey,
            data: {
                loggedin: true,
                user: {
                    uid: "c0a70c8c-2638-44e3-8d3a-794bb071838f"
                }
            }
        });
    });

    it("logged in as admin, returns status code 200", async() => {
        const res = await agent.get("/admin");
        expect(res.statusCode).toEqual(200);
    })
})

describe("signout", () => {
    it("sign user out, returns status code 200", async() => {
        const res = await agent.post("/signout");
        expect(res.statusCode).toEqual(200);
    })
})

describe("addgame", () => {
    beforeEach(async () => {
        await agent.post("/setsession").send({
            passKey,
            destroy: true,
        });
    });

    it("not logged in, returns status code 401", async() => {
        const res = await agent.post("/addgame");
        expect(res.statusCode).toEqual(401);
    })
})

describe("addgame", () => {
    beforeEach(async () => {
        await agent.post("/setsession").send({
            passKey,
            destroy: true,
        });

        await agent.post("/setsession").send({
            passKey,
            data: {
                loggedin: true,
                user: {
                    uid: "some non-admin ID"
                }
            }
        });
    });

    it("logged in as non-admin, returns status code 403", async() => {
        const res = await agent.post("/addgame");
        expect(res.statusCode).toEqual(403);
    })
})

describe("addgame", () => {
    beforeEach(async () => {
        await agent.post("/setsession").send({
            passKey,
            destroy: true,
        });

        await agent.post("/setsession").send({
            passKey,
            data: {
                loggedin: true,
                user: {
                    uid: "c0a70c8c-2638-44e3-8d3a-794bb071838f"
                }
            }
        });
    });

    it("logged in as admin, adds game and returns status code 200", async() => {
        const res = await agent.post("/addgame").send({
            products: [
                {
                    msrp: 4900,
                    platform: "pc",
                    price: 4900,
                    stock: 99
                },
                {
                    msrp: 5499,
                    platform: "ps4",
                    price: 5499,
                    stock: 99
                },
                {
                    msrp: 5499,
                    platform: "ps5",
                    price: 5499,
                    stock: 99
                },
                {
                    msrp: 4999,
                    platform: "xboxone",
                    price: 4999,
                    stock: 99
                },
                {
                    msrp: 4999,
                    platform: "xboxseries",
                    price: 4999,
                    stock: 99
                }
            ],
            name: "The Callisto Protocol",
            desc: "In this narrative-driven, third-person survival horror game set 300 years in the future, the player will take on the role of Jacob Lee – a victim of fate thrown into Black Iron Prison, a maximum-security penitentiary located on Jupiter's moon, Callisto. When inmates begin to transform into monstrous creatures, the prison is thrown into chaos.",
            genres: "Adventure, Shooter",
            slug: "the-callisto-protocol",
            coverTall: "https://images.igdb.com/igdb/image/upload/t_cover_big/co4ymo.png",
            coverWide: "https://images.igdb.com/igdb/image/upload/t_screenshot_big/schtuf.jpg",
            trailer: "https://www.youtube.com/watch?v=U9rSAmdywD4",
            studioName: "Striking Distance Studios",
            studioUrl: "https://sds.com/",
            releaseDate: "20221202",
            pegi: 18
        });
        expect(res.statusCode).toEqual(200);
    })
})

describe("deletegame", () => {
    beforeEach(async () => {
        await agent.post("/setsession").send({
            passKey,
            destroy: true,
        });
    });

    it("not logged in, returns status code 401", async() => {
        const res = await agent.post("/deletegame");
        expect(res.statusCode).toEqual(401);
    })
})

describe("deletegame", () => {
    beforeEach(async () => {
        await agent.post("/setsession").send({
            passKey,
            destroy: true,
        });

        await agent.post("/setsession").send({
            passKey,
            data: {
                loggedin: true,
                user: {
                    uid: "some non-admin ID"
                }
            }
        });
    });

    it("logged in as non-admin, returns status code 403", async() => {
        const res = await agent.post("/deletegame");
        expect(res.statusCode).toEqual(403);
    })
})

describe("deletegame", () => {
    beforeEach(async () => {
        await agent.post("/setsession").send({
            passKey,
            destroy: true,
        });

        await agent.post("/setsession").send({
            passKey,
            data: {
                loggedin: true,
                user: {
                    uid: "c0a70c8c-2638-44e3-8d3a-794bb071838f"
                }
            }
        });
    });

    it("logged in as admin, deletes game and returns status code 200", async() => {
        const res = await agent.post("/deletegame").send({
            slug: "the-callisto-protocol"
        });
        expect(res.statusCode).toEqual(200);
    })
})

describe("authwall", () => {
    beforeEach(async () => {
        await agent.post("/setsession").send({
            passKey,
            destroy: true,
        });
    });

    it("not logged in, returns status code 200", async() => {
        const res = await agent.get("/authwall");
        expect(res.statusCode).toEqual(200);
    })
})

describe("authwall", () => {
    beforeEach(async () => {
        await agent.post("/setsession").send({
            passKey,
            destroy: true,
        });

        await agent.post("/setsession").send({
            passKey,
            data: {
                loggedin: true,
            }
        });
    });

    it("logged in with no forward, returns status code 302 and redirects to /", async() => {
        const res = await agent.get("/authwall");
        expect(res.statusCode).toEqual(302);
        expect(res.header.location).toEqual("/");
    })
})

describe("authwall", () => {
    beforeEach(async () => {
        await agent.post("/setsession").send({
            passKey,
            destroy: true,
        });

        await agent.post("/setsession").send({
            passKey,
            data: {
                loggedin: true,
                forward: "/test"
            }
        });
    });

    it("logged in with no forward, returns status code 302 and redirects to forward ('/test')", async() => {
        const res = await agent.get("/authwall");
        expect(res.statusCode).toEqual(302);
        expect(res.header.location).toEqual("/test");
    })
})

describe("account", () => {
    beforeEach(async () => {
        await agent.post("/setsession").send({
            passKey,
            destroy: true,
        });
    });

    it("not logged in, returns status code 302", async() => {
        const res = await agent.get("/account");
        expect(res.statusCode).toEqual(302);
    })
})

describe("account", () => {
    beforeEach(async () => {
        await agent.post("/setsession").send({
            passKey,
            destroy: true,
        });

        await agent.post("/setsession").send({
            passKey,
            data: {
                loggedin: true,
                user: {
                    uid: "c0a70c8c-2638-44e3-8d3a-794bb071838f"
                }
            }
        });
    });

    it("logged in, returns status code 200", async() => {
        const res = await agent.get("/account");
        expect(res.statusCode).toEqual(200);
    })
})

describe("changedetails", () => {
    beforeEach(async () => {
        await agent.post("/setsession").send({
            passKey,
            destroy: true,
        });

        await agent.post("/setsession").send({
            passKey,
            data: {
                loggedin: true,
                user: {
                    uid: "c0a70c8c-2638-44e3-8d3a-794bb071838f"
                },
                uname: "Josh",
                photoURL: "https://media-exp1.licdn.com/dms/image/C4E03AQFB-3LBmBLtqQ/profile-displayphoto-shrink_800_800/0/1664032235469?e=1675296000&v=beta&t=vasOEEiu7oXLAyqQ23dJpjqfq3cf-PJuj6WIls8mIRI"
            }
        });
    });

    it("change avatar and username, returns status code 200", async() => {
        const res = await agent.post("/changedetails");
        expect(res.statusCode).toEqual(200);
    })
})

describe("addtocart", () => {
    beforeEach(async () => {
        await agent.post("/setsession").send({
            passKey,
            destroy: true,
        });
    });

    it("not logged in, returns status code 401", async() => {
        const res = await agent.post("/addtocart");
        expect(res.statusCode).toEqual(401);
    })
})

describe("addtocart", () => {
    beforeEach(async () => {
        await agent.post("/setsession").send({
            passKey,
            destroy: true,
        });

        await agent.post("/setsession").send({
            passKey,
            data: {
                loggedin: true,
                user: {
                    uid: "c0a70c8c-2638-44e3-8d3a-794bb071838f"
                }
            }
        });
    });

    it("logged in, adds item to cart and returns status code 200", async() => {
        const res = await agent.post("/addtocart").send({
            platform: "ps5",
            slug: "among-us"
        });
        expect(res.statusCode).toEqual(200);
    })
})

describe("removefromcart", () => {
    beforeEach(async () => {
        await agent.post("/setsession").send({
            passKey,
            destroy: true,
        });
    });

    it("not logged in, returns status code 401", async() => {
        const res = await agent.post("/removefromcart");
        expect(res.statusCode).toEqual(401);
    })
})

describe("removefromcart", () => {
    beforeEach(async () => {
        await agent.post("/setsession").send({
            passKey,
            destroy: true,
        });

        await agent.post("/setsession").send({
            passKey,
            data: {
                loggedin: true,
                user: {
                    uid: "c0a70c8c-2638-44e3-8d3a-794bb071838f"
                }
            }
        });
    });

    it("logged in, removes item from cart and returns status code 200", async() => {
        const res = await agent.post("/removefromcart").send({
            itemPlatform: "ps5",
            itemID: "bG0a0qnB88X2jUSocvMS"
        });
        expect(res.statusCode).toEqual(200);
    })
})

describe("cart", () => {
    beforeEach(async () => {
        await agent.post("/setsession").send({
            passKey,
            destroy: true,
        });
    });

    it("not logged in, returns status code 302", async() => {
        const res = await agent.get("/cart");
        expect(res.statusCode).toEqual(302);
    })
})

describe("cart", () => {
    beforeEach(async () => {
        await agent.post("/setsession").send({
            passKey,
            destroy: true,
        });

        await agent.post("/setsession").send({
            passKey,
            data: {
                loggedin: true,
                user: {
                    uid: "c0a70c8c-2638-44e3-8d3a-794bb071838f"
                }
            }
        });
    });

    it("logged in, gets items from cart and returns status code 200", async() => {
        const res = await agent.get("/cart");
        expect(res.statusCode).toEqual(200);
    })
})

describe("search", () => {
    it("returns status code 200", async() => {
        const res = await agent.get("/search");
        expect(res.statusCode).toEqual(200);
    })
})

describe("store_cache", () => {
    it("returns status code 200", async() => {
        const res = await agent.get("/store_cache");
        expect(res.statusCode).toEqual(200);
    })
})

describe("games", () => {
    it("games page returns status code 200", async() => {
        const res = await agent.get("/games");
        expect(res.statusCode).toEqual(200);
    })
})

describe("games", () => {
    it("game page for 'among-us' returns status code 200", async() => {
        const res = await agent.get("/games/among-us");
        expect(res.statusCode).toEqual(200);
    })
})

describe("games", () => {
    it("game page for 'nonexistant-title' returns status code 404", async() => {
        const res = await agent.get("/games/nonexistant-title");
        expect(res.statusCode).toEqual(404);
    })
})


describe("create-checkout-session", () => {
    beforeEach(async () => {
        await agent.post("/setsession").send({
            passKey,
            destroy: true,
        });
    });

    it("not logged in, returns status code 401", async() => {
        const res = await agent.post("/create-checkout-session");
        expect(res.statusCode).toEqual(401);
    })
})


let sessionString = "";
describe("create-checkout-session", () => {
    beforeEach(async () => {
        await agent.post("/setsession").send({
            passKey,
            destroy: true,
        });

        await agent.post("/setsession").send({
            passKey,
            data: {
                loggedin: true,
                user: {
                    uid: "c0a70c8c-2638-44e3-8d3a-794bb071838f"
                }
            }
        });
    });

    // NOTE: This only works if user has items in their cart, otherwise is caught by try/catch block and returns 400.
    it("logged in, returns status code 301 and session URL", async() => {
        const res = await agent.post("/create-checkout-session");
        sessionString = res.text;
        expect(res.statusCode).toEqual(301);
        expect(res.text).toEqual(expect.stringContaining("https://checkout.stripe.com/"));
    })
})


describe("success", () => {
    beforeEach(async () => {
        await agent.post("/setsession").send({
            passKey,
            destroy: true,
        });
    });

    it("not logged in, returns status code 302", async() => {
        const res = await agent.get("/success");
        expect(res.statusCode).toEqual(302);
    })
})

describe("success", () => {
    beforeEach(async () => {
        await agent.post("/setsession").send({
            passKey,
            destroy: true,
        });

        await agent.post("/setsession").send({
            passKey,
            data: {
                loggedin: true,
                user: {
                    uid: "c0a70c8c-2638-44e3-8d3a-794bb071838f"
                }
            }
        });
    });

    it("logged in with no session ID, returns status code 302", async() => {
        const res = await agent.get("/success");
        expect(res.statusCode).toEqual(302);
    })
})

describe("success", () => {
    beforeEach(async () => {
        await agent.post("/setsession").send({
            passKey,
            destroy: true,
        });

        await agent.post("/setsession").send({
            passKey,
            data: {
                loggedin: true,
                user: {
                    uid: "c0a70c8c-2638-44e3-8d3a-794bb071838f"
                },
                stripeSessionId: "somesessionid"
            }
        });
    });

    it("logged in with invalid session ID, returns status code 404", async() => {
        const res = await agent.get("/success");
        expect(res.statusCode).toEqual(404);
    })
})

describe("success", () => {
    beforeEach(async () => {
        await agent.post("/setsession").send({
            passKey,
            destroy: true,
        });

        await agent.post("/setsession").send({
            passKey,
            data: {
                loggedin: true,
                user: {
                    uid: "c0a70c8c-2638-44e3-8d3a-794bb071838f"
                },
                stripeSessionId: sessionString.split("/pay/")[1]
            }
        });
    });

    it("logged in with valid session ID from previous test, returns status code 200", async() => {
        const res = await agent.get("/success");
        expect(res.statusCode).toEqual(200);
    })
})

describe("contactmessage", () => {
    it("no message or email provided, returns status code 400", async() => {
        const res = await agent.post("/contactmessage");
        expect(res.statusCode).toEqual(400);
    })
})

let messageID = "";
describe("contactmessage", () => {
    it("message and email provided, returns status code 200", async() => {
        const res = await agent.post("/contactmessage").send({
            message: "Hello World!",
            email: "unittesting@test.test"
        });
        messageID = res.text;
        expect(res.statusCode).toEqual(200);
    })
})

describe("deletemessage", () => {
    beforeEach(async () => {
        await agent.post("/setsession").send({
            passKey,
            destroy: true,
        });
    });
    it("not logged in, returns status code 401", async() => {
        const res = await agent.post("/deletemessage");
        expect(res.statusCode).toEqual(401);
    })
})

describe("deletemessage", () => {
    beforeEach(async () => {
        await agent.post("/setsession").send({
            passKey,
            destroy: true,
        });

        await agent.post("/setsession").send({
            passKey,
            data: {
                loggedin: true,
                user: {
                    uid: "some non-admin ID"
                }
            }
        });
    });
    it("logged in as non-admin, returns status code 403", async() => {
        const res = await agent.post("/deletemessage");
        expect(res.statusCode).toEqual(403);
    })
})

describe("deletemessage", () => {
    beforeEach(async () => {
        await agent.post("/setsession").send({
            passKey,
            destroy: true,
        });

        await agent.post("/setsession").send({
            passKey,
            data: {
                loggedin: true,
                user: {
                    uid: "c0a70c8c-2638-44e3-8d3a-794bb071838f"
                }
            }
        });
    });
    it("logged in as admin with no ID provided, returns status code 400", async() => {
        const res = await agent.post("/deletemessage");
        expect(res.statusCode).toEqual(400);
    })
})

describe("deletemessage", () => {
    beforeEach(async () => {
        await agent.post("/setsession").send({
            passKey,
            destroy: true,
        });

        await agent.post("/setsession").send({
            passKey,
            data: {
                loggedin: true,
                user: {
                    uid: "c0a70c8c-2638-44e3-8d3a-794bb071838f"
                }
            }
        });
    });
    it("logged in as admin with ID provided, returns status code 200", async() => {
        const res = await agent.post("/deletemessage").send({
            id: messageID
        });
        expect(res.statusCode).toEqual(200);
    })
})

agent.post("/setsession").send({
    passKey,
    close: true,
});