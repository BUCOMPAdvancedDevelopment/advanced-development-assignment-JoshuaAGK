var config = {
    apiKey: "AIzaSyAktUs-Tq3WDjqCH8yVIUL-TGW22OUQvk0",
    authDomain: "advanced-development-s5208752.firebaseapp.com",
    projectId: "advanced-development-s5208752",
    storageBucket: "advanced-development-s5208752.appspot.com",
    messagingSenderId: "131173127435",
    appId: "1:131173127435:web:7d52c615328a1b6010be0e"
};

firebase.initializeApp(config);

const platforms = ["ps4", "ps5", "xboxone", "xboxseries", "pc", "switch"];

const stripe = Stripe("pk_test_51MBQ9HL9WNTnSD9b0IZZ5CUYiTsY1X9or31EUZHxzGQLLCMt4k76jJd8vz662Ut6w7xhjhf5pX2E27MZBX6HoKkJ00SYD4jllB");





const auth = firebase.auth();
const db = firebase.firestore();

matcher = window.matchMedia('(prefers-color-scheme: dark)');
matcher.addListener(onUpdate);
onUpdate();

function onUpdate() {
    lightSchemeIcon = document.querySelector('link#light-scheme-icon');
    darkSchemeIcon = document.querySelector('link#dark-scheme-icon');

    if (matcher.matches) {
        lightSchemeIcon.remove();
        document.head.append(darkSchemeIcon);
    } else {
        document.head.append(lightSchemeIcon);
        darkSchemeIcon.remove();
    }
}

function toggleSearchBar() {
    let body = document.querySelector("body");
    let header = document.querySelector("header");
    let searchBar = document.querySelector("#search-bar");

    body.classList.toggle("search-enabled");
    header.classList.toggle("search-enabled");
    searchBar.value = null;
};

window.addEventListener("pageshow", function(e) {
    let searchResults = document.querySelector("#search-results");
    if (!searchResults) {
        return;
    }

    let searchBar = document.querySelector("#search-bar");
    searchResults.innerHTML = null;
    searchBar.value = null;    
});

document.addEventListener('click', function(e) {
    let searchResults = document.querySelector("#search-results");
    if (!searchResults) {
        return;
    }

    let searchBar = document.querySelector("#search-bar");

    if (!searchResults.contains(e.target) && !searchBar.contains(e.target)) {
        searchResults.style.display = "none";
    }

    if (searchBar.contains(e.target)) {
        searchResults.style.display = null;
    }
});

function priceFormat(num, size = 3, after = true) {
    num = String(num);
    while (num.length < size) {
        num = after ? num + "0" : "0" + num;
    }
    return "£" + num.substring(0, num.length-  2) + "." + num.substring(num.length - 2);
}

async function setUsername() {
    const response = await axios.post("/changedetails", {
        uname: document.querySelector("#account-uname").value
    }, {
        validateStatus: false
    })
}

async function setPhotoURL() {
    const response = await axios.post("/changedetails", {
        photoURL: document.querySelector("#account-photourl").value
    }, {
        validateStatus: false
    })

    location.reload();
}

async function signOut() {
    auth.signOut()
    await axios.post("/signout", {});
    window.location.href = '/';
}

function searchQuerySubmit() {
    if (event.keyCode == 13) {
        searchQuery({ keyCode: 13 })
    }
}

let loadeditems = 0;
let queries = "";

async function searchQuery(e, replace = true) {
    if (pageName === "Games") {
        if (e.keyCode == 13) {
            const searchValue = document.querySelector("#search-bar").value;
            const sortValue = document.querySelector("#search-filter-sort").value;
            const genreValue = document.querySelector("#search-filter-genre").value;
            const platformValue = document.querySelector("#search-filter-platform").value;

            let searchResults = document.querySelector("#games-list");
            let existingInnerHTML = searchResults.innerHTML;

            let searchqueries = "?";
            searchqueries += "term=" + searchValue;
            searchqueries += "&sort=" + sortValue;
            searchqueries += "&genre=" + genreValue;
            searchqueries += "&platform=" + platformValue;
            searchqueries += "&pagelen=" + 5;

            if (searchqueries !== queries) {
                replace = true;
                loadeditems = 0;
            }

            queries = searchqueries;

            searchqueries += "&from=" + loadeditems;
            
            let content = await axios.get("/search" + searchqueries);
            let data = content.data;
            const itemstoload = data[0].results;
            data.shift();
            loadeditems += data.length;
            let listItems = [];

            console.log(data);

            for (item of data) {
                let listItem = document.createElement("li");
                listItem.className = "games-list-game";
                listItem.innerHTML += `<a class="games-list-link" href="/games/${item.slug}"></a>`;
                listItem.innerHTML += `<img class="games-list-img" src="${item.image}">`;
                listItem.innerHTML += `<p class="games-list-title">${item.name}</p>`;
                if (item.priceRange[0] === item.priceRange[item.priceRange.length - 1]) {
                    listItem.innerHTML += `<p class="games-list-price">${priceFormat(item.priceRange[0])}</p>`;
                } else {
                    listItem.innerHTML += `<p class="games-list-price">From ${priceFormat(item.priceRange[0])}</p>`;
                }

                listItem.innerHTML += `<div class="games-list-platforms black-invert"></div>`;
                if (item.platforms.some(platform => ["ps4", "ps5"].includes(platform))) {
                    listItem.querySelector(".games-list-platforms").innerHTML += `<img src="/media/bootstrap-icons-1.10.1/playstation.svg"/>`;
                }

                if (item.platforms.some(platform => ["xboxone", "xboxseries"].includes(platform))) {
                    listItem.querySelector(".games-list-platforms").innerHTML += `<img src="/media/bootstrap-icons-1.10.1/xbox.svg"/>`;
                }

                if (item.platforms.some(platform => ["pc"].includes(platform))) {
                    listItem.querySelector(".games-list-platforms").innerHTML += `<img src="/media/bootstrap-icons-1.10.1/windows.svg"/>`;
                }

                if (item.platforms.some(platform => ["switch"].includes(platform))) {
                    listItem.querySelector(".games-list-platforms").innerHTML += `<img src="/media/bootstrap-icons-1.10.1/nintendo-switch.svg"/>`;
                }
                
                listItems.push(listItem.outerHTML);
            }

            if (replace) {
                if (!existingInnerHTML.includes(listItems.join(""))) {
                    searchResults.innerHTML = listItems.join("");
                }
            } else {
                searchResults.innerHTML += listItems.join("");
            }

            if (loadeditems >= itemstoload) {
                document.querySelector("#next-page-btn").style.display = "none";
            } else {
                document.querySelector("#next-page-btn").style.display = null;
            }
        }
    } else {
        // if (e.keyCode == 13) {
        //     window.location.href = "/games";
        // }
        let searchResults = document.querySelector("#search-results");

        let existingInnerHTML = searchResults.innerHTML;

        let value = document.querySelector("#search-bar").value;

        if (!value) {
            searchResults.innerHTML = null;
            return;
        }

        let content = await axios.get("/search?term=" + value);
        let data = content.data;
        data.shift();

        let listItems = [];

        for (item of data) {
            let listItem = document.createElement("li");
            listItem.innerHTML += `<a class="search-result-link" href="/games/${item.slug}"></a>`;
            listItem.innerHTML += `<img class="search-result-img" src="${item.image}">`;
            listItem.innerHTML += `<p class="search-result-title">${item.name}</p>`;
            if (item.priceRange[0] === item.priceRange[item.priceRange.length - 1]) {
                listItem.innerHTML += `<p class="search-result-price">${priceFormat(item.priceRange[0])}</p>`;
            } else {
                listItem.innerHTML += `<p class="search-result-price">From ${priceFormat(item.priceRange[0])}</p>`;
            }
            listItems.push(listItem.outerHTML);
        }

        if (!existingInnerHTML.includes(listItems.join(""))) {
            searchResults.innerHTML = listItems.join("");
        }
    }
}

function nextPage() {
    searchQuery({keyCode: 13}, false);
}

window.addEventListener("load", () => {
    const forms = document.querySelectorAll("form");
    for (const form of forms) {
        form.addEventListener("submit", () => { event.preventDefault(); });
    }

    if (document.querySelector("#hero-slider .swiper")) {
        const swiper = new Swiper('#hero-slider .swiper', {
            loop: true,
            autoplay: {
                delay: 5000
            },
            pagination: {
                el: '.swiper-pagination',
            },
        });
    }

    if (document.querySelector("#checkout-button")) {
        document.querySelector("#checkout-button").addEventListener("click", async () => {
            const response = await axios.post("/create-checkout-session", {}, {
                validateStatus: false
            })

            if (response.status == 301) {
                window.location.href = response.data;
            }
        });
    }
}, false); 

async function addToCart(e) {
    const platform = e.attributes.platform.value;
    const slug = e.attributes.slug.value;


    const response = await axios.post("../addtocart", {
        platform,
        slug
    }, {
        validateStatus: false
    })

    switch (response.status) {
        case 401:
            window.location.href = '/authwall';
            break;
        case 400:
            if (response.data.includes("already in cart")) {
                alert("Item already in cart");
            }
            break;
        case 200:
            alert("Item added to cart");
            break;
    }

    console.log(response);
}

async function removeFromCart(e) {
    const parentNode = e.parentNode;
    const itemID = parentNode.attributes.productid.value;
    const itemPlatform = parentNode.attributes.platform.value;

    const response = await axios.post("../removefromcart", {
        itemID,
        itemPlatform
    }, {
        validateStatus: false
    })

    if (response.status == 200) {
        const cartItems = document.querySelectorAll(".cart-item").length;
        if (cartItems <= 1) {
            location.reload();
        } else {
            parentNode.remove();
            const newCartItems = document.querySelectorAll(".cart-item");
            let newTotalPrice = 0;
            for (const item of newCartItems) {
                let priceStr = item.querySelector(".cart-item-price").innerHTML;
                priceStr = priceStr.replace(/\D/g,'');
                newTotalPrice += parseInt(priceStr);
            }
            document.querySelector("#purchase-total").innerHTML = priceFormat(newTotalPrice);
        }
    }
}

async function signingoogle() {
    var provider = new firebase.auth.GoogleAuthProvider();

    firebase.auth()
    .signInWithPopup(provider)
    .then(async (result) => {
        const user = result.user;

        // console.log("Signed in with Google!")
        // console.log(user);

        let response = await axios.post("/storeUser", {
            user: JSON.stringify(user)
        }, {
            validateStatus: false
        })

        if (response.status === 301) {
            window.location.href = response.data;
        }

        console.log(response.data);
        console.log(response.status);
    }).catch((error) => {
        var errorMessage = error.message;
        console.warn("Error signing in with Google");
        console.error(errorMessage)
    });
}