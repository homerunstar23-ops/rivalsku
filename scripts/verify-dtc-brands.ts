import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

export type BrandCandidate = {
  domain: string;
  name?: string;
  category:
    | "Apparel"
    | "Footwear"
    | "Home"
    | "Beauty"
    | "Kitchen"
    | "Outdoor"
    | "Wellness"
    | "Kids"
    | "Pets"
    | "Jewelry"
    | "Tech Accessories";
};

const CANDIDATES: BrandCandidate[] = [
  // Existing verified / core Apparel
  { domain: "taylorstitch.com", name: "Taylor Stitch", category: "Apparel" },
  { domain: "american-giant.com", name: "American Giant", category: "Apparel" },
  { domain: "alexmill.com", name: "Alex Mill", category: "Apparel" },
  { domain: "marinelayer.com", name: "Marine Layer", category: "Apparel" },
  { domain: "kotn.com", name: "Kotn", category: "Apparel" },
  { domain: "organicbasics.com", name: "Organic Basics", category: "Apparel" },
  { domain: "everybody.world", name: "Everybody.World", category: "Apparel" },
  { domain: "colorfulstandard.com", name: "Colorful Standard", category: "Apparel" },
  { domain: "christydawn.com", name: "Christy Dawn", category: "Apparel" },
  { domain: "shopdoen.com", name: "DÔEN", category: "Apparel" },
  { domain: "hillhousehome.com", name: "Hill House Home", category: "Apparel" },
  { domain: "jennikayne.com", name: "Jenni Kayne", category: "Apparel" },
  { domain: "lakepajamas.com", name: "Lake Pajamas", category: "Apparel" },
  { domain: "lunya.co", name: "Lunya", category: "Apparel" },
  { domain: "eberjey.com", name: "Eberjey", category: "Apparel" },
  { domain: "ministryofsupply.com", name: "Ministry of Supply", category: "Apparel" },
  { domain: "cutsclothing.com", name: "Cuts Clothing", category: "Apparel" },
  { domain: "untuckit.com", name: "UNTUCKit", category: "Apparel" },
  { domain: "tentree.com", name: "Tentree", category: "Apparel" },
  { domain: "gymshark.com", name: "Gymshark", category: "Apparel" },
  { domain: "youngla.com", name: "YoungLA", category: "Apparel" },
  { domain: "alphaleteathletics.com", name: "Alphalete", category: "Apparel" },
  { domain: "aloyoga.com", name: "Alo Yoga", category: "Apparel" },
  { domain: "outdoorvoices.com", name: "Outdoor Voices", category: "Apparel" },
  { domain: "vuoriclothing.com", name: "Vuori", category: "Apparel" },
  { domain: "rhone.com", name: "Rhone", category: "Apparel" },
  { domain: "ten-thousand.cc", name: "Ten Thousand", category: "Apparel" },
  { domain: "tenthousand.cc", name: "Ten Thousand", category: "Apparel" },
  { domain: "mackweldon.com", name: "Mack Weldon", category: "Apparel" },
  { domain: "tommyjohn.com", name: "Tommy John", category: "Apparel" },
  { domain: "meundies.com", name: "MeUndies", category: "Apparel" },
  { domain: "bombas.com", name: "Bombas", category: "Apparel" },
  { domain: "stancesocks.com", name: "Stance", category: "Apparel" },
  { domain: "stance.com", name: "Stance", category: "Apparel" },
  { domain: "chubbiesshorts.com", name: "Chubbies", category: "Apparel" },
  { domain: "byltbasics.com", name: "BYLT Basics", category: "Apparel" },
  { domain: "trueclassictees.com", name: "True Classic", category: "Apparel" },
  { domain: "freshcleantees.com", name: "Fresh Clean Threads", category: "Apparel" },
  { domain: "pistolake.com", name: "Pistol Lake", category: "Apparel" },
  { domain: "buckmason.com", name: "Buck Mason", category: "Apparel" },
  { domain: "todd-snyder.com", name: "Todd Snyder", category: "Apparel" },
  { domain: "toddsnyder.com", name: "Todd Snyder", category: "Apparel" },
  { domain: "corridornyc.com", name: "Corridor", category: "Apparel" },
  { domain: "fahertybrand.com", name: "Faherty", category: "Apparel" },
  { domain: "outerknown.com", name: "Outerknown", category: "Apparel" },
  { domain: "roddandgunn.com", name: "Rodd & Gunn", category: "Apparel" },
  { domain: "mizzenandmain.com", name: "Mizzen+Main", category: "Apparel" },
  { domain: "stateandliberty.com", name: "State and Liberty", category: "Apparel" },
  { domain: "bonobos.com", name: "Bonobos", category: "Apparel" },
  { domain: "universalstandard.com", name: "Universal Standard", category: "Apparel" },
  { domain: "girlfriend.com", name: "Girlfriend Collective", category: "Apparel" },
  { domain: "skims.com", name: "SKIMS", category: "Apparel" },
  { domain: "fashionnova.com", name: "Fashion Nova", category: "Apparel" },
  { domain: "princesspolly.com", name: "Princess Polly", category: "Apparel" },
  { domain: "us.princesspolly.com", name: "Princess Polly", category: "Apparel" },
  { domain: "reformation.com", name: "Reformation", category: "Apparel" },
  { domain: "thereformation.com", name: "Reformation", category: "Apparel" },
  { domain: "sezane.com", name: "Sezane", category: "Apparel" },
  { domain: "rails.com", name: "Rails", category: "Apparel" },
  { domain: "frankandeileen.com", name: "Frank & Eileen", category: "Apparel" },
  { domain: "mate-the-label.myshopify.com", name: "MATE the Label", category: "Apparel" },
  { domain: "matethelabel.com", name: "MATE the Label", category: "Apparel" },
  { domain: "pactapparel.com", name: "Pact", category: "Apparel" },
  { domain: "wearpact.com", name: "Pact", category: "Apparel" },
  { domain: "losangelesapparel.net", name: "Los Angeles Apparel", category: "Apparel" },
  { domain: "entireworld.com", name: "Entireworld", category: "Apparel" },
  { domain: "kith.com", name: "Kith", category: "Apparel" },
  { domain: "aimelondondore.com", name: "Aimé Leon Dore", category: "Apparel" },
  { domain: "aimeleondore.com", name: "Aimé Leon Dore", category: "Apparel" },
  { domain: "noahny.com", name: "Noah", category: "Apparel" },
  { domain: "rowingblazers.com", name: "Rowing Blazers", category: "Apparel" },
  { domain: "beis.com", name: "BÉIS", category: "Apparel" },
  { domain: "beistravel.com", name: "BÉIS", category: "Apparel" },
  { domain: "awaytravel.com", name: "Away", category: "Apparel" },
  { domain: "monos.com", name: "Monos", category: "Apparel" },
  { domain: "dagnedover.com", name: "Dagne Dover", category: "Apparel" },
  { domain: "cuyana.com", name: "Cuyana", category: "Apparel" },
  { domain: "calpaktravel.com", name: "CALPAK", category: "Apparel" },
  { domain: "breezygolf.com", name: "Breezy Golf", category: "Apparel" },
  { domain: "badbirdiegolf.com", name: "Bad Birdie", category: "Apparel" },
  { domain: "greysonclothiers.com", name: "Greyson Clothiers", category: "Apparel" },
  { domain: "goodr.com", name: "goodr", category: "Apparel" },
  { domain: "knockaround.com", name: "Knockaround", category: "Apparel" },
  { domain: "blenders.com", name: "Blenders Eyewear", category: "Apparel" },
  { domain: "blenderseyewear.com", name: "Blenders Eyewear", category: "Apparel" },
  { domain: "diffeyewear.com", name: "DIFF Eyewear", category: "Apparel" },
  { domain: "quay.com", name: "Quay", category: "Apparel" },
  { domain: "le-spec.com", name: "Le Specs", category: "Apparel" },
  { domain: "lespecs.com", name: "Le Specs", category: "Apparel" },
  { domain: "mvmt.com", name: "MVMT", category: "Apparel" },

  // Footwear
  { domain: "allbirds.com", name: "Allbirds", category: "Footwear" },
  { domain: "nisolo.com", name: "Nisolo", category: "Footwear" },
  { domain: "koio.co", name: "KOIO", category: "Footwear" },
  { domain: "greats.com", name: "GREATS", category: "Footwear" },
  { domain: "olukai.com", name: "OluKai", category: "Footwear" },
  { domain: "vessi.com", name: "Vessi", category: "Footwear" },
  { domain: "rothys.com", name: "Rothy's", category: "Footwear" },
  { domain: "atoms.com", name: "Atoms", category: "Footwear" },
  { domain: "cariuma.com", name: "CARIUMA", category: "Footwear" },
  { domain: "thursdayboots.com", name: "Thursday Boot Co.", category: "Footwear" },
  { domain: "taftclothing.com", name: "TAFT", category: "Footwear" },
  { domain: "beckett-simonon.com", name: "Beckett Simonon", category: "Footwear" },
  { domain: "beckettsimonon.com", name: "Beckett Simonon", category: "Footwear" },
  { domain: "tecovas.com", name: "Tecovas", category: "Footwear" },
  { domain: "kizik.com", name: "Kizik", category: "Footwear" },
  { domain: "xeroshoes.com", name: "Xero Shoes", category: "Footwear" },
  { domain: "vivobarefoot.com", name: "Vivobarefoot", category: "Footwear" },
  { domain: "nobullproject.com", name: "NOBULL", category: "Footwear" },
  { domain: "fluxfootwear.com", name: "Flux Footwear", category: "Footwear" },
  { domain: "oofos.com", name: "OOFOS", category: "Footwear" },
  { domain: "huckberry.com", name: "Huckberry", category: "Footwear" },
  { domain: "birdies.com", name: "Birdies", category: "Footwear" },
  { domain: "margauxny.com", name: "Margaux", category: "Footwear" },
  { domain: "fredasalvador.com", name: "FREDA SALVADOR", category: "Footwear" },
  { domain: "soludos.com", name: "Soludos", category: "Footwear" },
  { domain: "hari-mari.com", name: "Hari Mari", category: "Footwear" },
  { domain: "harimari.com", name: "Hari Mari", category: "Footwear" },
  { domain: "chacos.com", name: "Chaco", category: "Footwear" },
  { domain: "astridandmiyu.com", name: "Astrid & Miyu", category: "Jewelry" },

  // Outdoor
  { domain: "howlerbros.com", name: "Howler Brothers", category: "Outdoor" },
  { domain: "roark.com", name: "Roark", category: "Outdoor" },
  { domain: "birdwell.com", name: "Birdwell", category: "Outdoor" },
  { domain: "vuori.com", name: "Vuori", category: "Outdoor" },
  { domain: "cotopaxi.com", name: "Cotopaxi", category: "Outdoor" },
  { domain: "topo-designs.com", name: "Topo Designs", category: "Outdoor" },
  { domain: "topodesigns.com", name: "Topo Designs", category: "Outdoor" },
  { domain: "peakdesign.com", name: "Peak Design", category: "Outdoor" },
  { domain: "yeti.com", name: "YETI", category: "Outdoor" },
  { domain: "rticoutdoors.com", name: "RTIC", category: "Outdoor" },
  { domain: "rumpl.com", name: "Rumpl", category: "Outdoor" },
  { domain: "bioliteenergy.com", name: "BioLite", category: "Outdoor" },
  { domain: "kammok.com", name: "Kammok", category: "Outdoor" },
  { domain: "enonation.com", name: "ENO", category: "Outdoor" },
  { domain: "eaglesnestoutfittersinc.com", name: "ENO", category: "Outdoor" },
  { domain: "hydroflask.com", name: "Hydro Flask", category: "Outdoor" },
  { domain: "kleankanteen.com", name: "Klean Kanteen", category: "Outdoor" },
  { domain: "miir.com", name: "MiiR", category: "Outdoor" },
  { domain: "corkcicle.com", name: "Corkcicle", category: "Outdoor" },
  { domain: "stanley1913.com", name: "Stanley", category: "Outdoor" },
  { domain: "solostove.com", name: "Solo Stove", category: "Outdoor" },
  { domain: "breeo.co", name: "Breeo", category: "Outdoor" },
  { domain: "oyster.com", name: "Oyster", category: "Outdoor" },
  { domain: "oystercooler.com", name: "Oyster", category: "Outdoor" },
  { domain: "matadorup.com", name: "Matador", category: "Outdoor" },
  { domain: "bellroy.com", name: "Bellroy", category: "Outdoor" },
  { domain: "aer-sf.com", name: "Aer", category: "Outdoor" },
  { domain: "aersf.com", name: "Aer", category: "Outdoor" },
  { domain: "wandrd.com", name: "WANDRD", category: "Outdoor" },
  { domain: "hyperlitemountaingear.com", name: "Hyperlite Mountain Gear", category: "Outdoor" },
  { domain: "kuiu.com", name: "KUIU", category: "Outdoor" },
  { domain: "duckcamp.com", name: "Duck Camp", category: "Outdoor" },
  { domain: "freeflyapparel.com", name: "Free Fly", category: "Outdoor" },
  { domain: "katinusa.com", name: "Katin", category: "Outdoor" },
  { domain: "vissla.com", name: "Vissla", category: "Outdoor" },
  { domain: "banksjournal.com", name: "Banks Journal", category: "Outdoor" },
  { domain: "ryder.com", name: "Ryder", category: "Outdoor" },
  { domain: "sunski.com", name: "Sunski", category: "Outdoor" },

  // Home
  { domain: "cultiver.com", name: "Cultiver", category: "Home" },
  { domain: "linoto.com", name: "Linoto", category: "Home" },
  { domain: "pigletinbed.com", name: "Piglet in Bed", category: "Home" },
  { domain: "coyuchi.com", name: "Coyuchi", category: "Home" },
  { domain: "ettitude.com", name: "ettitude", category: "Home" },
  { domain: "cozyearth.com", name: "Cozy Earth", category: "Home" },
  { domain: "buffy.co", name: "Buffy", category: "Home" },
  { domain: "snowe.co", name: "SNOWE", category: "Home" },
  { domain: "maidenhome.com", name: "Maiden Home", category: "Home" },
  { domain: "albanypark.com", name: "Albany Park", category: "Home" },
  { domain: "burrow.com", name: "Burrow", category: "Home" },
  { domain: "insideweather.com", name: "Inside Weather", category: "Home" },
  { domain: "branchbasics.com", name: "Branch Basics", category: "Home" },
  { domain: "blueland.com", name: "Blueland", category: "Home" },
  { domain: "dropps.com", name: "Dropps", category: "Home" },
  { domain: "dirtylabs.com", name: "Dirty Labs", category: "Home" },
  { domain: "bearaby.com", name: "Bearaby", category: "Home" },
  { domain: "balooliving.com", name: "Baloo Living", category: "Home" },
  { domain: "gravityblankets.com", name: "Gravity Blankets", category: "Home" },
  { domain: "hushblankets.com", name: "Hush Blankets", category: "Home" },
  { domain: "brooklinen.com", name: "Brooklinen", category: "Home" },
  { domain: "parachutehome.com", name: "Parachute", category: "Home" },
  { domain: "bollandbranch.com", name: "Boll & Branch", category: "Home" },
  { domain: "tuftandneedle.com", name: "Tuft & Needle", category: "Home" },
  { domain: "casper.com", name: "Casper", category: "Home" },
  { domain: "brooklynbedding.com", name: "Brooklyn Bedding", category: "Home" },
  { domain: "purple.com", name: "Purple", category: "Home" },
  { domain: "helixsleep.com", name: "Helix Sleep", category: "Home" },
  { domain: "ruggable.com", name: "Ruggable", category: "Home" },
  { domain: "revivalrugs.com", name: "Revival Rugs", category: "Home" },
  { domain: "floydhome.com", name: "Floyd", category: "Home" },
  { domain: "article.com", name: "Article", category: "Home" },
  { domain: "branchfurniture.com", name: "Branch Furniture", category: "Home" },
  { domain: "schoolhouse.com", name: "Schoolhouse", category: "Home" },
  { domain: "otherland.com", name: "Otherland", category: "Home" },
  { domain: "boy-smells.com", name: "Boy Smells", category: "Home" },
  { domain: "boysmells.com", name: "Boy Smells", category: "Home" },
  { domain: "homesick.com", name: "Homesick", category: "Home" },
  { domain: "pura.com", name: "Pura", category: "Home" },
  { domain: "hotelcollection.com", name: "Hotel Collection", category: "Home" },
  { domain: "vitruvi.com", name: "Vitruvi", category: "Home" },
  { domain: "loftie.com", name: "Loftie", category: "Home" },
  { domain: "byloftie.com", name: "Loftie", category: "Home" },
  { domain: "hatch.co", name: "Hatch", category: "Home" },
  { domain: "minna-goods.com", name: "MINNA", category: "Home" },
  { domain: "poketo.com", name: "Poketo", category: "Home" },
  { domain: "areaware.com", name: "Areaware", category: "Home" },
  { domain: "quiettownhome.com", name: "Quiet Town", category: "Home" },

  // Kitchen
  { domain: "greatjonesgoods.com", name: "Great Jones", category: "Kitchen" },
  { domain: "materialkitchen.com", name: "Material Kitchen", category: "Kitchen" },
  { domain: "yearandday.com", name: "Year & Day", category: "Kitchen" },
  { domain: "fablehome.co", name: "Fable", category: "Kitchen" },
  { domain: "eastfork.com", name: "East Fork", category: "Kitchen" },
  { domain: "heathceramics.com", name: "Heath Ceramics", category: "Kitchen" },
  { domain: "hawkinsnewyork.com", name: "Hawkins New York", category: "Kitchen" },
  { domain: "ourplace.com", name: "Our Place", category: "Kitchen" },
  { domain: "fromourplace.com", name: "Our Place", category: "Kitchen" },
  { domain: "carawayhome.com", name: "Caraway", category: "Kitchen" },
  { domain: "madeincookware.com", name: "Made In", category: "Kitchen" },
  { domain: "hexclad.com", name: "HexClad", category: "Kitchen" },
  { domain: "misen.com", name: "Misen", category: "Kitchen" },
  { domain: "hedleyandbennett.com", name: "Hedley & Bennett", category: "Kitchen" },
  { domain: "fellowproducts.com", name: "Fellow", category: "Kitchen" },
  { domain: "breville.com", name: "Breville", category: "Kitchen" },
  { domain: "ooni.com", name: "Ooni", category: "Kitchen" },
  { domain: "gozney.com", name: "Gozney", category: "Kitchen" },
  { domain: "thermoworks.com", name: "ThermoWorks", category: "Kitchen" },
  { domain: "meater.com", name: "MEATER", category: "Kitchen" },
  { domain: "stasherbag.com", name: "Stasher", category: "Kitchen" },
  { domain: "gir.co", name: "GIR", category: "Kitchen" },
  { domain: "beast.com", name: "Beast Health", category: "Kitchen" },
  { domain: "drinkhydrant.com", name: "Hydrant", category: "Wellness" },
  { domain: "brightland.co", name: "Brightland", category: "Kitchen" },
  { domain: "graza.co", name: "Graza", category: "Kitchen" },
  { domain: "flybyjing.com", name: "Fly By Jing", category: "Kitchen" },
  { domain: "momofuku.com", name: "Momofuku Goods", category: "Kitchen" },
  { domain: "shop.momofuku.com", name: "Momofuku Goods", category: "Kitchen" },
  { domain: "ochef.com", name: "Ochef", category: "Kitchen" },
  { domain: "diasporaco.com", name: "Diaspora Co.", category: "Kitchen" },
  { domain: "burlapandbarrel.com", name: "Burlap & Barrel", category: "Kitchen" },
  { domain: "trade-coffee.com", name: "Trade Coffee", category: "Kitchen" },
  { domain: "bluebottlecoffee.com", name: "Blue Bottle Coffee", category: "Kitchen" },
  { domain: "chamberlaincoffee.com", name: "Chamberlain Coffee", category: "Kitchen" },
  { domain: "drinkolipop.com", name: "OLIPOP", category: "Kitchen" },
  { domain: "drinkpoppi.com", name: "Poppi", category: "Kitchen" },

  // Beauty
  { domain: "colourpop.com", name: "ColourPop", category: "Beauty" },
  { domain: "herbivorebotanicals.com", name: "Herbivore Botanicals", category: "Beauty" },
  { domain: "truebotanicals.com", name: "True Botanicals", category: "Beauty" },
  { domain: "oseamalibu.com", name: "OSEA Malibu", category: "Beauty" },
  { domain: "tataharperskincare.com", name: "Tata Harper", category: "Beauty" },
  { domain: "dieuxskin.com", name: "Dieux", category: "Beauty" },
  { domain: "sundayriley.com", name: "Sunday Riley", category: "Beauty" },
  { domain: "peachandlily.com", name: "Peach & Lily", category: "Beauty" },
  { domain: "farmacybeauty.com", name: "Farmacy", category: "Beauty" },
  { domain: "kosas.com", name: "Kosas", category: "Beauty" },
  { domain: "saiehello.com", name: "Saie", category: "Beauty" },
  { domain: "tower28beauty.com", name: "Tower 28", category: "Beauty" },
  { domain: "ellisbrooklyn.com", name: "Ellis Brooklyn", category: "Beauty" },
  { domain: "dedcool.com", name: "DedCool", category: "Beauty" },
  { domain: "phlur.com", name: "PHLUR", category: "Beauty" },
  { domain: "skylar.com", name: "Skylar", category: "Beauty" },
  { domain: "crownaffair.com", name: "Crown Affair", category: "Beauty" },
  { domain: "breadbeautysupply.com", name: "Bread Beauty Supply", category: "Beauty" },
  { domain: "innersensebeauty.com", name: "Innersense", category: "Beauty" },
  { domain: "verbproducts.com", name: "Verb", category: "Beauty" },
  { domain: "jonesroadbeauty.com", name: "Jones Road", category: "Beauty" },
  { domain: "meritbeauty.com", name: "MERIT", category: "Beauty" },
  { domain: "roseinc.com", name: "Rose Inc", category: "Beauty" },
  { domain: "rmsbeauty.com", name: "RMS Beauty", category: "Beauty" },
  { domain: "wellpeople.com", name: "W3LL PEOPLE", category: "Beauty" },
  { domain: "versedskin.com", name: "Versed", category: "Beauty" },
  { domain: "pacificabeauty.com", name: "Pacifica", category: "Beauty" },
  { domain: "winkylux.com", name: "Winky Lux", category: "Beauty" },
  { domain: "glossier.com", name: "Glossier", category: "Beauty" },
  { domain: "summerfridays.com", name: "Summer Fridays", category: "Beauty" },
  { domain: "rhodeskin.com", name: "rhode", category: "Beauty" },
  { domain: "rarebeauty.com", name: "Rare Beauty", category: "Beauty" },
  { domain: "fentybeauty.com", name: "Fenty Beauty", category: "Beauty" },
  { domain: "kyliecosmetics.com", name: "Kylie Cosmetics", category: "Beauty" },
  { domain: "iliabeauty.com", name: "ILIA Beauty", category: "Beauty" },
  { domain: "milkmakeup.com", name: "Milk Makeup", category: "Beauty" },
  { domain: "tatcha.com", name: "Tatcha", category: "Beauty" },
  { domain: "drunkelephant.com", name: "Drunk Elephant", category: "Beauty" },
  { domain: "youthtothepeople.com", name: "Youth To The People", category: "Beauty" },
  { domain: "glowrecipe.com", name: "Glow Recipe", category: "Beauty" },
  { domain: "topicals.com", name: "Topicals", category: "Beauty" },
  { domain: "mytopicals.com", name: "Topicals", category: "Beauty" },
  { domain: "cocokind.com", name: "cocokind", category: "Beauty" },
  { domain: "supergoop.com", name: "Supergoop!", category: "Beauty" },
  { domain: "naturium.com", name: "Naturium", category: "Beauty" },
  { domain: "byoma.com", name: "BYOMA", category: "Beauty" },
  { domain: "necessaire.com", name: "Nécessaire", category: "Beauty" },
  { domain: "saltair.com", name: "Saltair", category: "Beauty" },
  { domain: "soldejaneiro.com", name: "Sol de Janeiro", category: "Beauty" },
  { domain: "ouai.com", name: "OUAI", category: "Beauty" },
  { domain: "theouai.com", name: "OUAI", category: "Beauty" },
  { domain: "daehair.com", name: "dae", category: "Beauty" },
  { domain: "gisou.com", name: "Gisou", category: "Beauty" },
  { domain: "us.gisou.com", name: "Gisou", category: "Beauty" },
  { domain: "olaplex.com", name: "OLAPLEX", category: "Beauty" },
  { domain: "k18hair.com", name: "K18", category: "Beauty" },
  { domain: "patternbeauty.com", name: "PATTERN Beauty", category: "Beauty" },
  { domain: "billie.com", name: "Billie", category: "Beauty" },
  { domain: "mybillie.com", name: "Billie", category: "Beauty" },
  { domain: "nativecos.com", name: "Native", category: "Beauty" },
  { domain: "harrys.com", name: "Harry's", category: "Beauty" },
  { domain: "bevel.com", name: "Bevel", category: "Beauty" },
  { domain: "getbevel.com", name: "Bevel", category: "Beauty" },
  { domain: "supply.co", name: "Supply", category: "Beauty" },
  { domain: "drsquatch.com", name: "Dr. Squatch", category: "Beauty" },
  { domain: "manscaped.com", name: "MANSCAPED", category: "Beauty" },

  // Wellness
  { domain: "perelelhealth.com", name: "Perelel", category: "Wellness" },
  { domain: "birdandbe.com", name: "Bird&Be", category: "Wellness" },
  { domain: "fullwellfertility.com", name: "FullWell", category: "Wellness" },
  { domain: "moonjuice.com", name: "Moon Juice", category: "Wellness" },
  { domain: "thenueco.com", name: "The Nue Co", category: "Wellness" },
  { domain: "welleco.com", name: "WelleCo", category: "Wellness" },
  { domain: "hilma.co", name: "Hilma", category: "Wellness" },
  { domain: "sundayscaries.com", name: "Sunday Scaries", category: "Wellness" },
  { domain: "everydaydose.com", name: "Everyday Dose", category: "Wellness" },
  { domain: "mudwtr.com", name: "MUD/WTR", category: "Wellness" },
  { domain: "ryzesuperfoods.com", name: "RYZE", category: "Wellness" },
  { domain: "us.foursigmatic.com", name: "Four Sigmatic", category: "Wellness" },
  { domain: "curehydration.com", name: "Cure Hydration", category: "Wellness" },
  { domain: "nuunlife.com", name: "Nuun", category: "Wellness" },
  { domain: "skratchlabs.com", name: "Skratch Labs", category: "Wellness" },
  { domain: "drinkghia.com", name: "Ghia", category: "Wellness" },
  { domain: "kineuphorics.com", name: "Kin Euphorics", category: "Wellness" },
  { domain: "drinkdesoi.com", name: "De Soi", category: "Wellness" },
  { domain: "curiouselixirs.com", name: "Curious Elixirs", category: "Wellness" },
  { domain: "equipfoods.com", name: "Equip Foods", category: "Wellness" },
  { domain: "transparentlabs.com", name: "Transparent Labs", category: "Wellness" },
  { domain: "livemomentous.com", name: "Momentous", category: "Wellness" },
  { domain: "getkion.com", name: "Kion", category: "Wellness" },
  { domain: "drinklmnt.com", name: "LMNT", category: "Wellness" },
  { domain: "liquid-iv.com", name: "Liquid I.V.", category: "Wellness" },
  { domain: "drinkag1.com", name: "AG1", category: "Wellness" },
  { domain: "seed.com", name: "Seed", category: "Wellness" },
  { domain: "ritual.com", name: "Ritual", category: "Wellness" },
  { domain: "golde.co", name: "Golde", category: "Wellness" },
  { domain: "sakara.com", name: "Sakara", category: "Wellness" },
  { domain: "ollie.com", name: "Ollie", category: "Pets" },
  { domain: "therabody.com", name: "Therabody", category: "Wellness" },
  { domain: "hyperice.com", name: "Hyperice", category: "Wellness" },
  { domain: "bala.com", name: "Bala", category: "Wellness" },
  { domain: "shopbala.com", name: "Bala", category: "Wellness" },
  { domain: "liforme.com", name: "Liforme", category: "Wellness" },
  { domain: "manduka.com", name: "Manduka", category: "Wellness" },
  { domain: "eight-sleep.com", name: "Eight Sleep", category: "Wellness" },
  { domain: "chirp.com", name: "Chirp", category: "Wellness" },
  { domain: "gochirp.com", name: "Chirp", category: "Wellness" },
  { domain: "apollo-neuro.com", name: "Apollo Neuro", category: "Wellness" },
  { domain: "apolloneuro.com", name: "Apollo Neuro", category: "Wellness" },
  { domain: "lemonade.com", name: "Lemonade", category: "Wellness" },
  { domain: "hims.com", name: "Hims", category: "Wellness" },
  { domain: "cymbiotika.com", name: "Cymbiotika", category: "Wellness" },
  { domain: "beamtlc.com", name: "beam", category: "Wellness" },
  { domain: "shopbeam.com", name: "beam", category: "Wellness" },
  { domain: "oura.com", name: "Oura", category: "Wellness" },
  { domain: "ouraring.com", name: "Oura", category: "Wellness" },
  { domain: "whoop.com", name: "WHOOP", category: "Wellness" },

  // Kids
  { domain: "kytebaby.com", name: "Kyte Baby", category: "Kids" },
  { domain: "littlesleepies.com", name: "Little Sleepies", category: "Kids" },
  { domain: "poshpeanut.com", name: "Posh Peanut", category: "Kids" },
  { domain: "cadenlane.com", name: "Caden Lane", category: "Kids" },
  { domain: "sollybaby.com", name: "Solly Baby", category: "Kids" },
  { domain: "ergopouch.com", name: "ergoPouch", category: "Kids" },
  { domain: "us.ergopouch.com", name: "ergoPouch", category: "Kids" },
  { domain: "hannaandersson.com", name: "Hanna Andersson", category: "Kids" },
  { domain: "primary.com", name: "Primary", category: "Kids" },
  { domain: "tea-collection.com", name: "Tea Collection", category: "Kids" },
  { domain: "teacollection.com", name: "Tea Collection", category: "Kids" },
  { domain: "ryleeandcru.com", name: "Rylee + Cru", category: "Kids" },
  { domain: "quincymae.com", name: "Quincy Mae", category: "Kids" },
  { domain: "jamiekay.com", name: "Jamie Kay", category: "Kids" },
  { domain: "coloredorganics.com", name: "Colored Organics", category: "Kids" },
  { domain: "mushie.com", name: "mushie", category: "Kids" },
  { domain: "lovery.com", name: "Lovevery", category: "Kids" },
  { domain: "lovevery.com", name: "Lovevery", category: "Kids" },
  { domain: "nuggetcomfort.com", name: "Nugget", category: "Kids" },
  { domain: "lalo.com", name: "Lalo", category: "Kids" },
  { domain: "meetlalo.com", name: "Lalo", category: "Kids" },
  { domain: "uppababy.com", name: "UPPAbaby", category: "Kids" },
  { domain: "mockingbird.com", name: "Mockingbird", category: "Kids" },
  { domain: "hellomockingbird.com", name: "Mockingbird", category: "Kids" },
  { domain: "tenlittle.com", name: "Ten Little", category: "Kids" },
  { domain: "plae.co", name: "PLAE", category: "Kids" },
  { domain: "tubbytodd.com", name: "Tubby Todd", category: "Kids" },
  { domain: "hello-bello.com", name: "Hello Bello", category: "Kids" },
  { domain: "hellobello.com", name: "Hello Bello", category: "Kids" },
  { domain: "coterie.com", name: "Coterie", category: "Kids" },
  { domain: "pipettebaby.com", name: "Pipette", category: "Kids" },
  { domain: "gunamuna.com", name: "gunamuna", category: "Kids" },
  { domain: "magneticme.com", name: "Magnetic Me", category: "Kids" },
  { domain: "monicaandandy.com", name: "Monica + Andy", category: "Kids" },
  { domain: "statebags.com", name: "STATE Bags", category: "Kids" },
  { domain: "bento.com", name: "Bentgo", category: "Kids" },
  { domain: "bentgo.com", name: "Bentgo", category: "Kids" },

  // Pets
  { domain: "wildone.com", name: "Wild One", category: "Pets" },
  { domain: "fablepets.com", name: "Fable Pets", category: "Pets" },
  { domain: "zee.dog", name: "Zee.Dog", category: "Pets" },
  { domain: "zeedog.com", name: "Zee.Dog", category: "Pets" },
  { domain: "barkbox.com", name: "BARK", category: "Pets" },
  { domain: "barkshop.com", name: "BARK Shop", category: "Pets" },
  { domain: "nativepet.com", name: "Native Pet", category: "Pets" },
  { domain: "openfarmpet.com", name: "Open Farm", category: "Pets" },
  { domain: "thefarmersdog.com", name: "The Farmer's Dog", category: "Pets" },
  { domain: "petplate.com", name: "PetPlate", category: "Pets" },
  { domain: "sundaysfordogs.com", name: "Sundays for Dogs", category: "Pets" },
  { domain: "spotandtango.com", name: "Spot & Tango", category: "Pets" },
  { domain: "jinx.com", name: "Jinx", category: "Pets" },
  { domain: "thinkjinx.com", name: "Jinx", category: "Pets" },
  { domain: "boccesbakery.com", name: "Bocce's Bakery", category: "Pets" },
  { domain: "shamelesspets.com", name: "Shameless Pets", category: "Pets" },
  { domain: "maxbone.com", name: "maxbone", category: "Pets" },
  { domain: "rifrufqueens.com", name: "RIFRUF", category: "Pets" },
  { domain: "littlebeast.co", name: "Little Beast", category: "Pets" },
  { domain: "lambwolf.co", name: "Lambwolf Collective", category: "Pets" },
  { domain: "tuftandpaw.com", name: "Tuft + Paw", category: "Pets" },
  { domain: "pretty-litter.com", name: "PrettyLitter", category: "Pets" },
  { domain: "prettylitter.com", name: "PrettyLitter", category: "Pets" },
  { domain: "litter-robot.com", name: "Whisker", category: "Pets" },
  { domain: "whisker.com", name: "Whisker", category: "Pets" },
  { domain: "fi.com", name: "Fi", category: "Pets" },
  { domain: "tryfi.com", name: "Fi", category: "Pets" },
  { domain: "wildearth.com", name: "Wild Earth", category: "Pets" },
  { domain: "ferapetorganics.com", name: "Fera Pets", category: "Pets" },
  { domain: "westpaw.com", name: "West Paw", category: "Pets" },
  { domain: "ruffwear.com", name: "Ruffwear", category: "Pets" },
  { domain: "kurgo.com", name: "Kurgo", category: "Pets" },
  { domain: "lucyand.co", name: "Lucy & Co.", category: "Pets" },

  // Jewelry
  { domain: "mejuri.com", name: "Mejuri", category: "Jewelry" },
  { domain: "gorjana.com", name: "gorjana", category: "Jewelry" },
  { domain: "analuisa.com", name: "Ana Luisa", category: "Jewelry" },
  { domain: "catbirdnyc.com", name: "Catbird", category: "Jewelry" },
  { domain: "jenniferfisherjewelry.com", name: "Jennifer Fisher", category: "Jewelry" },
  { domain: "auratenewyork.com", name: "AURATE", category: "Jewelry" },
  { domain: "vrai.com", name: "VRAI", category: "Jewelry" },
  { domain: "ringconcierge.com", name: "Ring Concierge", category: "Jewelry" },
  { domain: "stoneandstrand.com", name: "Stone and Strand", category: "Jewelry" },
  { domain: "pavoi.com", name: "PAVOI", category: "Jewelry" },
  { domain: "evryjewels.com", name: "Evry Jewels", category: "Jewelry" },
  { domain: "enroutejewelry.com", name: "En Route", category: "Jewelry" },
  { domain: "heymaeve.com", name: "Hey Maeve", category: "Jewelry" },
  { domain: "melinda-maria.com", name: "Melinda Maria", category: "Jewelry" },
  { domain: "melindamaria.com", name: "Melinda Maria", category: "Jewelry" },
  { domain: "electricpicks.com", name: "Electric Picks", category: "Jewelry" },
  { domain: "baublebar.com", name: "BaubleBar", category: "Jewelry" },
  { domain: "kendrascott.com", name: "Kendra Scott", category: "Jewelry" },
  { domain: "alexandani.com", name: "Alex and Ani", category: "Jewelry" },
  { domain: "missoma.com", name: "Missoma", category: "Jewelry" },
  { domain: "us.missoma.com", name: "Missoma", category: "Jewelry" },
  { domain: "monicavinader.com", name: "Monica Vinader", category: "Jewelry" },
  { domain: "mejuri.com", name: "Mejuri", category: "Jewelry" },
  { domain: "caitlynminimalist.com", name: "Caitlyn Minimalist", category: "Jewelry" },
  { domain: "studs.com", name: "Studs", category: "Jewelry" },
  { domain: "maisonmiru.com", name: "Maison Miru", category: "Jewelry" },
  { domain: "gld.com", name: "GLD", category: "Jewelry" },
  { domain: "thegldshop.com", name: "GLD", category: "Jewelry" },
  { domain: "jaxxon.com", name: "JAXXON", category: "Jewelry" },
  { domain: "craftdlondon.com", name: "CRAFTD", category: "Jewelry" },
  { domain: "mianzi.com", name: "Mianzi", category: "Jewelry" },
  { domain: "miansai.com", name: "Miansai", category: "Jewelry" },
  { domain: "lisa-angel.co.uk", name: "Lisa Angel", category: "Jewelry" },

  // Tech Accessories
  { domain: "nomadgoods.com", name: "Nomad Goods", category: "Tech Accessories" },
  { domain: "ridge.com", name: "The Ridge", category: "Tech Accessories" },
  { domain: "casetify.com", name: "CASETiFY", category: "Tech Accessories" },
  { domain: "dbrand.com", name: "dbrand", category: "Tech Accessories" },
  { domain: "moment.com", name: "Moment", category: "Tech Accessories" },
  { domain: "shopmoment.com", name: "Moment", category: "Tech Accessories" },
  { domain: "nativeunion.com", name: "Native Union", category: "Tech Accessories" },
  { domain: "satechi.net", name: "Satechi", category: "Tech Accessories" },
  { domain: "anker.com", name: "Anker", category: "Tech Accessories" },
  { domain: "keychron.com", name: "Keychron", category: "Tech Accessories" },
  { domain: "nuphy.com", name: "NuPhy", category: "Tech Accessories" },
  { domain: "lofree.co", name: "Lofree", category: "Tech Accessories" },
  { domain: "grovemade.com", name: "Grovemade", category: "Tech Accessories" },
  { domain: "ugmonk.com", name: "Ugmonk", category: "Tech Accessories" },
  { domain: "orbitkey.com", name: "Orbitkey", category: "Tech Accessories" },
  { domain: "ekster.com", name: "Ekster", category: "Tech Accessories" },
  { domain: "secrid.com", name: "Secrid", category: "Tech Accessories" },
  { domain: "quadlockcase.com", name: "Quad Lock", category: "Tech Accessories" },
  { domain: "mous.co", name: "Mous", category: "Tech Accessories" },
  { domain: "peel.com", name: "PEEL", category: "Tech Accessories" },
  { domain: "buypeel.com", name: "PEEL", category: "Tech Accessories" },
  { domain: "totalleecase.com", name: "Totallee", category: "Tech Accessories" },
  { domain: "smartish.com", name: "Smartish", category: "Tech Accessories" },
  { domain: "popsockets.com", name: "PopSockets", category: "Tech Accessories" },
  { domain: "loopycases.com", name: "Loopy Cases", category: "Tech Accessories" },
  { domain: "sonix.com", name: "Sonix", category: "Tech Accessories" },
  { domain: "shopsonix.com", name: "Sonix", category: "Tech Accessories" },
  { domain: "wildflowercases.com", name: "Wildflower Cases", category: "Tech Accessories" },
  { domain: "flauntcases.com", name: "FLAUNT", category: "Tech Accessories" },
  { domain: "bandolierstyle.com", name: "Bandolier", category: "Tech Accessories" },
  { domain: "andarem.com", name: "Andar", category: "Tech Accessories" },
  { domain: "andar.com", name: "Andar", category: "Tech Accessories" },
  { domain: "mujjo.com", name: "Mujjo", category: "Tech Accessories" },
  { domain: "pitaka.com", name: "PITAKA", category: "Tech Accessories" },
  { domain: "ipitaka.com", name: "PITAKA", category: "Tech Accessories" },
  { domain: "backbone.com", name: "Backbone", category: "Tech Accessories" },
  { domain: "playbackbone.com", name: "Backbone", category: "Tech Accessories" },
  { domain: "sharge.com", name: "SHARGE", category: "Tech Accessories" },
  { domain: "rayconglobal.com", name: "Raycon", category: "Tech Accessories" },
  { domain: "status.co", name: "Status Audio", category: "Tech Accessories" },
  { domain: "skullcandy.com", name: "Skullcandy", category: "Tech Accessories" },
  { domain: "wyze.com", name: "Wyze", category: "Tech Accessories" },
  { domain: "ember.com", name: "Ember", category: "Tech Accessories" },
  { domain: "larq.com", name: "LARQ", category: "Tech Accessories" },
  { domain: "livelarq.com", name: "LARQ", category: "Tech Accessories" },
  { domain: "courant.com", name: "Courant", category: "Tech Accessories" },
  { domain: "staycourant.com", name: "Courant", category: "Tech Accessories" },
  { domain: "twelve-south.com", name: "Twelve South", category: "Tech Accessories" },
  { domain: "twelvesouth.com", name: "Twelve South", category: "Tech Accessories" },
];

type VerifiedBrand = {
  domain: string;
  canonicalDomain: string;
  name: string;
  slug: string;
  category: string;
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function checkBrand(c: BrandCandidate): Promise<VerifiedBrand | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    const res = await fetch(`https://${c.domain}/products.json?limit=1`, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "RivalSKU-Verifier/1.0 (+https://rivalsku.com)",
        Accept: "application/json",
      },
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("json")) return null;
    const data = (await res.json()) as { products?: Array<{ id?: unknown }> };
    if (!Array.isArray(data?.products) || data.products.length === 0) return null;

    const finalHost = new URL(res.url).hostname.replace(/^www\./, "").toLowerCase();
    const displayName = c.name || c.domain.split(".")[0]!;
    return {
      domain: c.domain,
      canonicalDomain: finalHost,
      name: displayName,
      slug: slugify(displayName),
      category: c.category,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  // Also pull any active stores from rivalsku.db that might not be in CANDIDATES
  const dbPath = path.resolve(process.cwd(), "data", "rivalsku.db");
  const seenDomains = new Set<string>();
  const deduped: BrandCandidate[] = [];

  for (const c of CANDIDATES) {
    const d = c.domain.toLowerCase().replace(/^www\./, "");
    if (!seenDomains.has(d)) {
      seenDomains.add(d);
      deduped.push({ ...c, domain: d });
    }
  }

  if (fs.existsSync(dbPath)) {
    const db = new Database(dbPath, { readonly: true });
    const rows = db
      .prepare("SELECT domain, name, vertical FROM stores WHERE status = 'active'")
      .all() as Array<{ domain: string; name: string; vertical: string | null }>;
    for (const r of rows) {
      const d = r.domain.toLowerCase().replace(/^www\./, "");
      if (!seenDomains.has(d)) {
        seenDomains.add(d);
        let cat: BrandCandidate["category"] = "Apparel";
        const v = (r.vertical || "").toLowerCase();
        if (v.includes("home")) cat = "Home";
        else if (v.includes("beauty")) cat = "Beauty";
        else if (v.includes("wellness")) cat = "Wellness";
        else if (v.includes("foot")) cat = "Footwear";
        deduped.push({ domain: d, name: r.name, category: cat });
      }
    }
  }

  console.log(`Checking ${deduped.length} candidate Shopify DTC brands...`);

  const verified: VerifiedBrand[] = [];
  const concurrency = 28;
  let idx = 0;

  async function worker() {
    while (idx < deduped.length) {
      const item = deduped[idx++]!;
      const ok = await checkBrand(item);
      if (ok) verified.push(ok);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  // Deduplicate by canonicalDomain and slug
  const byCanon = new Map<string, VerifiedBrand>();
  const usedSlugs = new Set<string>();
  for (const b of verified) {
    if (byCanon.has(b.canonicalDomain)) continue;
    let slug = b.slug;
    if (usedSlugs.has(slug)) {
      slug = `${slug}-${b.canonicalDomain.split(".")[0]}`;
    }
    usedSlugs.add(slug);
    byCanon.set(b.canonicalDomain, { ...b, slug });
  }

  const finalBrands = Array.from(byCanon.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const byCat: Record<string, number> = {};
  for (const b of finalBrands) {
    byCat[b.category] = (byCat[b.category] || 0) + 1;
  }

  console.log(`Verified ${finalBrands.length} live Shopify DTC brands!`);
  console.log("By category:", byCat);

  const outPath = path.resolve(process.cwd(), "src", "config", "dtc-brands.json");
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        updatedAt: new Date().toISOString(),
        totalCount: finalBrands.length,
        brands: finalBrands,
      },
      null,
      2,
    ),
    "utf8",
  );
  console.log(`Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
