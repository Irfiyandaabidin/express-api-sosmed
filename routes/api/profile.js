const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const Profile = require('../../models/Profile');
const User = require('../../models/User')
const { check, validationResult } = require('express-validator');
const config = require('config');
const request = require('request')

router.get('/me', auth, async (req, res) => {
    try {
        const profile = await Profile.findOne({ user: req.user.id 
        }).populate('user', ['name', 'avatar']);
        
        if(!profile) {
            return res.status(400).json({ msg: 'Tidak ada profile untuk user ini'});
        }
        res.json(profile);
    } catch(err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/profile
// @desc    Create or Update user profile
// @access  Private

router.post('/', [
    auth,
    [
        check('status','status is required')
        .not()
        .isEmpty(),
        check('skills', 'skill is required')
        .not()
        .isEmpty()
    ]
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            company,
            website,
            location,
            bio,
            status,
            githubUsername,
            skills,
            youtube,
            facebook,
            twitter,
            instagram,
            linkedin
        } = req.body;

        // build profile object
        const profileFields = {};
        profileFields.user = req.user.id;
        if (company) profileFields.company = company;
        if (website) profileFields.website = website;
        if (location) profileFields.location = location;
        if (bio) profileFields.bio = bio;
        if (status) profileFields.status = status;
        if (githubUsername) profileFields.githubUsername = githubUsername;
        if (skills) {
            profileFields.skills = skills.split(',').map(skill => skill.trim());
        }
        // console.log(profileFields.skills);
        // res.json(profileFields.skills);

        // build social object
        profileFields.social = {}
        if (youtube) profileFields.social.youtube = youtube;
        if (twitter) profileFields.social.twitter = twitter;
        if (facebook) profileFields.social.facebook = facebook;
        if (linkedin) profileFields.social.linkedin = linkedin;
        if (instagram) profileFields.social.instagram = instagram;

        try {
            let profile = await Profile.findOne({ user: req.user.id });

            if (profile) {

                // update profile
                profile = await Profile.findOneAndUpdate(
                    { user: req.user.id },
                    { $set: profileFields },
                    { new: true }
                );

                return res.json(profile);
            }

            // create profile
            profile = new Profile(profileFields);

            await profile.save();
            res.json(profile);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    }
);

router.get('/', async (req, res) => {
    try {
        const profiles = await Profile.find().populate('user', ['name', 'avatar']);
        res.json(profiles);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.get('/user/:user_id', async (req, res) => {
    try {
        const profile = await Profile.find({ user: req.params.user_id })
        .populate('user', ['name', 'avatar']);
    
        if(!profile) return res.status(400).json({ msg: "Profile tidak ditemukan" })
        res.json(profile);
    } catch(err) {
        console.error(err.message);
        if(err.kind == 'objectId') {
            return res.status(400).json({ msg: "Profile tidak ditemukan" });
        }
        res.status(500).send('Server Error');
    }
})

router.delete('/', auth, async (req, res) => {
    try {
        // remover profile
        await Profile.findOneAndRemove({ user: req.user.id });

        // remove user
        await Profile.findOneAndRemove({ _id: req.user.id });
        res.json({ msg: 'User berhasil dihapus' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.put('/experience', [
    auth,
    [
        check('title', 'Title is required')
        .not()
        .isEmpty(),
        check('company', 'Company is required')
        .not()
        .isEmpty(),
        check('from', 'From is required')
        .not()
        .isEmpty()
    ]
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if(!errors.isEmpty()){
            return res.status(400).json({ errors: errors.array() });
        }

        // destructuring
        const {
            title,
            company,
            location,
            from,
            to,
            current,
            description
        } = req.body;

        const newExp = {
            title,
            company,
            location,
            from,
            to,
            current,
            description
        }

        try {
            const profile = await Profile.findOne({ user: req.user.id });

            profile.experience.unshift(newExp);

            await profile.save()

            res.json(profile);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    }
)

// @route   DELETE api/profile/experience/exp_id
// @desc    Delete experience from profile
// @access  Private

router.delete('/experience/:exp_id', auth, async (req, res) =>{
    try {
        const profile = await Profile.findOne({ user: req.user.id });

        // Get remove index
        const removeIndex = profile.experience
        .map(item => item.id)
        .indexOf(req.params.exp_id);

        profile.experience.splice(removeIndex, 1);
        
        await profile.save();

        res.json(profile);

    } catch(err) {
        console.log(err.message);
        res.status(500).send('Server Error');
    }
})

// @route       PUT api/profile/education
// @descAdd     profile user education
// @access      Private

router.put('/education', [
    auth,
    [
        check('school', 'School is required')
        .not()
        .isEmpty(),
        check('degree', 'Degree is required')
        .not()
        .isEmpty(),
        check('fieldOfStudy', 'Field of study is required')
        .not()
        .isEmpty(),
        check('from', 'From is required')
        .not()
        .isEmpty()
    ]
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if(!errors.isEmpty()){
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            school,
            degree,
            fieldOfStudy,
            from,
            to,
            current,
            description
        } = req.body;

        const newEdu = {
            school,
            degree,
            fieldOfStudy,
            from,
            to,
            current,
            description
        }

        try {
            const profile = await Profile.findOne({ user: req.user.id});

            profile.education.unshift(newEdu);

            await profile.save();

            res.json(profile);
        } catch (err){
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    }
)

// @route   DELETE api/profile/education/edu_id
// @desc    Delete education from profile
// @access  Private
router.delete('/education/:edu_id', auth, async (req, res) => {
    try {
        const profile = await Profile.findOne({ user: req.user.id });

        // Get remove index
        const removeIndex = profile.education
        .map(item => item.id)
        .indexOf(req.params.edu_id);

        profile.education.splice(removeIndex, 1);

        await profile.save();

        res.json(profile);
    } catch(err){
        console.log(err.message);
        res.status(500).send('Server Error');
    }
})

// @route   GET api/profile/github/:username
// @desc    GET user repo from Github.com
// @access  Public

router.get('/github/:username', (req, res) =>{
    try{
        const options = {
            uri: `https://api.github.com/users/${req.params.username}/repos?
            per_page=5&sort=created:asc&client_id=${config.get('githubClientId')}&client_secret=${config.get('githubSecret')}`,
            method: 'GET',
            headers: { 'user-agent' : 'node.js' } 
        };

        request(options, (error, response, body) => {
            if(error) console.error(error);

            if(response.statusCode !== 200) {
                return res.status(404).json({ msg: 'No github profile found' });
            }

            res.json(JSON.parse(body));
        })
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error Github');
    }
})

module.exports = router;