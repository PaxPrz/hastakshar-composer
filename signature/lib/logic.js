/**
* This checks if singee is in allowed list or not
* @param {com.pax.signature.Signee} verifier
* @param {com.pax.signature.Signee} owner
* @return {boolean} True if yes, false if no.
*/
function checkAllowedOrNot(verifier, ownerSign){
	return ownerSign.owner.allowedList.includes(verifier.emailId);
}

/**
* Login
* @param {com.pax.signature.UserCheck} detail
* @transaction
*/
async function userCheck(detail){
	var ns = "com.pax.signature";
  var factory = getFactory();
  //var allowed = false;
  var signeeRegistry = await getParticipantRegistry(ns+".Signee");
	var user = await signeeRegistry.get(detail.email);
  //  var user = factory.newRelationship(ns, "Signee", detail.email);
    if(user.password == sha256(detail.password)){
    	//allowed = true;
    }else{
		throw new Error("User Invalid");
	}
  
  //return allowed;
}

/**
* Create User
* @param {com.pax.signature.CreateUser} user
* @transaction
*/
async function createUser(user){
	var ns = "com.pax.signature";
  var factory = getFactory();
	var newUser = factory.newResource(ns, "Signee", user.emailId);
	newUser.allowedList = [];
	
	var valInfo = factory.newResource(ns, "ValidationInfo", user.emailId);
	valInfo.valInfo = [];
	var valInfoRegistry = await getAssetRegistry(ns+'.ValidationInfo');
	await valInfoRegistry.add(valInfo);

	newUser.val = valInfo;
	newUser.name = user.name;
	newUser.password = sha256(user.password); //use hash as password
	
	var signeeRegistry = await getParticipantRegistry(ns+'.Signee');
	await signeeRegistry.add(newUser);
}

/**
* Upload Signature
* @param {com.pax.signature.UploadSignature} sigDetail
* @transaction
*/
async function uploadSignature(sigDetail){
  	var ns = "com.pax.signature";
  	var owner = getCurrentParticipant();	
  
	var factory = getFactory();
  	var newSign = factory.newResource(ns, 'Signature', sigDetail.sigId);
  	newSign.owner = owner;
  	newSign.signatureHash = sigDetail.signatureHash;
  
  	const signRegistry = await getAssetRegistry(ns+'.Signature');
  	await signRegistry.add(newSign);
  
  	owner.sign = newSign;
  	
  	const signeeRegistry = await getParticipantRegistry(ns+'.Signee');
  	await signeeRegistry.update(owner);
  
}

/**
* Add signee to allowed list
* @param {com.pax.signature.AddToAllowedList} allowedList
* @transaction
*/
async function addToAllowedList(allowedList){
  	var ns = "com.pax.signature";
	var owner = getCurrentParticipant();
  
  	if(!owner.allowedList.includes(allowedList.validator.emailId)){
	  owner.allowedList.push(allowedList.validator.emailId);
	  }
  
  	var signeeRegistry = await getParticipantRegistry(ns+".Signee");
  	signeeRegistry.update(owner);
}

/**
* Validate other signature
* @param {com.pax.signature.CheckAllowed} validateSign
* @transaction
*/
async function checkAllowed(validateSign){
  	var ns = "com.pax.signature";
	  var validator = getCurrentParticipant();
	  //var allowed = false;
	  var string = "";

  	if(validateSign.owner.emailId!=null){
		string = "Email: "+validator.emailId+" has tried to verify no authority.";

		if(validateSign.owner.sign.signatureHash==validateSign.signatureHash){
			//allowed = true;
			string = "Email: "+validator.emailId +" has verify authority.";
		}else{
			throw new Error("User has no authority")
		}

    
  } else{
	  throw new Error("User Invalid")
	  //return false;
	//validator.val.valInfo.push(err.toString());
  }
  //return allowed;
}

/**
 * Record result in ValidationInfo
 * @param {com.pax.signature.RecordResult} detail 
 * @transaction
 */
async function recordResult(detail){
	var ns = "com.pax.signature";
	var validator = getCurrentParticipant();
	var string = "";
	try{
		if(detail.owner.emailId!=null){
			string = "Result: "+validator.emailId+" got "+detail.result+"% verifying your sign.("+detail.datetime+")";
		}
	}catch(err){
		string = "Failed: "+validator.emailId+" has somehow failed to store. ("+detail.datetime+")";
	}
  	detail.owner.val.valInfo.push(string);
	var valInfoRegistry = await getAssetRegistry(ns+'.ValidationInfo');
	await valInfoRegistry.update(detail.owner.val);
}

/**
 * Disallow Signee if allowed
 * @param {com.pax.signature.Disallow} detail 
 * @transaction
 */
async function disallow(detail){
	var ns = "com.pax.signature";
	var current = getCurrentParticipant();
	if(current.allowedList.includes(detail.email)){
		current.allowedList.splice(current.allowedList.indexOf(detail.email),1);
	}
	var signeeRegistry = await getParticipantRegistry(ns+'.Signee');
	await signeeRegistry.update(current);
}

/**
* This is sha256 algorithm
* @param {String} ascii
* @return {String} sha256 sum of ascii
*/
function sha256(ascii) {
	function rightRotate(value, amount) {
		return (value>>>amount) | (value<<(32 - amount));
	};

	var mathPow = Math.pow;
	var maxWord = mathPow(2, 32);
	var lengthProperty = 'length'
	var i, j; // Used as a counter across the whole file
	var result = ''

	var words = [];
	var asciiBitLength = ascii[lengthProperty]*8;

	//* caching results is optional - remove/add slash from front of this line to toggle
	// Initial hash value: first 32 bits of the fractional parts of the square roots of the first 8 primes
	// (we actually calculate the first 64, but extra values are just ignored)
	var hash = sha256.h = sha256.h || [];
	// Round constants: first 32 bits of the fractional parts of the cube roots of the first 64 primes
	var k = sha256.k = sha256.k || [];
	var primeCounter = k[lengthProperty];
	/*/
	var hash = [], k = [];
	var primeCounter = 0;
	//*/

	var isComposite = {};
	for (var candidate = 2; primeCounter < 64; candidate++) {
		if (!isComposite[candidate]) {
			for (i = 0; i < 313; i += candidate) {
				isComposite[i] = candidate;
			}
			hash[primeCounter] = (mathPow(candidate, .5)*maxWord)|0;
			k[primeCounter++] = (mathPow(candidate, 1/3)*maxWord)|0;
		}
	}

	ascii += '\x80' // Append Ƈ' bit (plus zero padding)
	while (ascii[lengthProperty]%64 - 56) ascii += '\x00' // More zero padding
	for (i = 0; i < ascii[lengthProperty]; i++) {
		j = ascii.charCodeAt(i);
		if (j>>8) return; // ASCII check: only accept characters in range 0-255
		words[i>>2] |= j << ((3 - i)%4)*8;
	}
	words[words[lengthProperty]] = ((asciiBitLength/maxWord)|0);
	words[words[lengthProperty]] = (asciiBitLength)

	// process each chunk
	for (j = 0; j < words[lengthProperty];) {
		var w = words.slice(j, j += 16); // The message is expanded into 64 words as part of the iteration
		var oldHash = hash;
		// This is now the undefinedworking hash", often labelled as variables a...g
		// (we have to truncate as well, otherwise extra entries at the end accumulate
		hash = hash.slice(0, 8);

		for (i = 0; i < 64; i++) {
			var i2 = i + j;
			// Expand the message into 64 words
			// Used below if
			var w15 = w[i - 15], w2 = w[i - 2];

			// Iterate
			var a = hash[0], e = hash[4];
			var temp1 = hash[7]
				+ (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) // S1
				+ ((e&hash[5])^((~e)&hash[6])) // ch
				+ k[i]
				// Expand the message schedule if needed
				+ (w[i] = (i < 16) ? w[i] : (
						w[i - 16]
						+ (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15>>>3)) // s0
						+ w[i - 7]
						+ (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2>>>10)) // s1
					)|0
				);
			// This is only used once, so *could* be moved below, but it only saves 4 bytes and makes things unreadble
			var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) // S0
				+ ((a&hash[1])^(a&hash[2])^(hash[1]&hash[2])); // maj

			hash = [(temp1 + temp2)|0].concat(hash); // We don't bother trimming off the extra ones, they're harmless as long as we're truncating when we do the slice()
			hash[4] = (hash[4] + temp1)|0;
		}

		for (i = 0; i < 8; i++) {
			hash[i] = (hash[i] + oldHash[i])|0;
		}
	}

	for (i = 0; i < 8; i++) {
		for (j = 3; j + 1; j--) {
			var b = (hash[i]>>(j*8))&255;
			result += ((b < 16) ? 0 : '') + b.toString(16);
		}
	}
	return result;
};
       
