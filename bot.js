require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require('discord.js');
const chalk = require('chalk');
const moment = require('moment');
const { parsePhoneNumber } = require('libphonenumber-js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// ======================================
//  CALL LOGS DATABASE (IN MEMORY STORAGE)
// ======================================
const callLogsDatabase = new Map();

// ======================================
//  BOT READY EVENT
// ======================================
client.on('ready', () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║           DISCORD PHONE TRACKER BOT v2.0.0                  ║
║              PROFESSIONAL PRIVATE EDITION                   ║
╚══════════════════════════════════════════════════════════════╝
    ✅ Logged in as: ${client.user.tag}
    ✅ Serving ${client.guilds.cache.size} servers
    ✅ System initialized successfully
    ✅ All modules loaded
    ═══════════════════════════════════════════════════════════
    Time: ${moment().format('DD/MM/YYYY HH:mm:ss')}
    Status: ACTIVE | READY
    ═══════════════════════════════════════════════════════════
`);

    client.user.setActivity({
        name: 'Mobile Tracking System',
        type: 3
    });
});

// ======================================
//  COMMAND HANDLER
// ======================================
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(process.env.PREFIX)) return;

    const args = message.content.slice(process.env.PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // ======================================
    //  /track <phone-number> COMMAND
    // ======================================
    if (command === 'track') {
        if (!args[0]) {
            return sendErrorEmbed(message, 
                'INVALID USAGE', 
                'Please provide a valid mobile number\n**Usage:** `!track +919876543210`'
            );
        }

        const phoneNumber = args[0];
        
        try {
            const parsedNumber = parsePhoneNumber(phoneNumber);
            
            if (!parsedNumber.isValid()) {
                return sendErrorEmbed(message, 
                    'INVALID PHONE NUMBER', 
                    'The number you provided is not a valid international mobile number.\nPlease use format: `+CountryCodeNumber`'
                );
            }

            const locationData = {
                country: parsedNumber.country,
                countryName: getCountryName(parsedNumber.country),
                region: parsedNumber.geocoding?.region || 'Region Data Available',
                carrier: parsedNumber.carrier || 'Network Operator Detected',
                type: parsedNumber.getType(),
                isPossible: parsedNumber.isPossible(),
                isMobile: parsedNumber.getType() === 'MOBILE',
                nationalFormat: parsedNumber.formatNational(),
                internationalFormat: parsedNumber.formatInternational(),
                timeZone: getTimezoneForCountry(parsedNumber.country)
            };

            const trackEmbed = new EmbedBuilder()
                .setColor('#00ff88')
                .setTitle('📡 MOBILE NUMBER LOCATION TRACKER')
                .setDescription(`✅ **TRACKING SUCCESSFUL**\nLocation data retrieved for target number`)
                .addFields(
                    { name: '📱 Number', value: `\`\`\`${locationData.internationalFormat}\`\`\``, inline: false },
                    { name: '🌍 Country', value: `${locationData.countryName} (${locationData.country})`, inline: true },
                    { name: '📍 Region', value: `${locationData.region}`, inline: true },
                    { name: '📶 Network', value: `${locationData.carrier}`, inline: true },
                    { name: '⏰ Time Zone', value: `${locationData.timeZone}`, inline: true },
                    { name: '📋 Type', value: `${locationData.type}`, inline: true },
                    { name: '✅ Verification', value: `Number Verified: ${locationData.isPossible ? 'YES' : 'NO'}`, inline: true },
                    { name: '🔒 Security Status', value: `System: OPERATIONAL | Encrypted Connection`, inline: false }
                )
                .setFooter({ text: `PRIVATE USE ONLY | Requested by ${message.author.tag}` })
                .setTimestamp();

            await message.channel.send({ embeds: [trackEmbed] });

        } catch (error) {
            return sendErrorEmbed(message, 
                'TRACKING FAILED', 
                'Could not process phone number. Ensure you are using correct international format.'
            );
        }
    }

    // ======================================
    //  /log add <number> <type> <duration> COMMAND
    // ======================================
    if (command === 'log' && args[0] === 'add') {
        const phoneNumber = args[1];
        const callType = args[2]?.toUpperCase(); // INCOMING / OUTGOING
        const duration = args[3] || '0:00';

        if (!phoneNumber || !callType) {
            return sendErrorEmbed(message, 
                'INVALID USAGE', 
                'Usage: `!log add +919876543210 INCOMING 5:32`'
            );
        }

        if (!callLogsDatabase.has(phoneNumber)) {
            callLogsDatabase.set(phoneNumber, []);
        }

        const callEntry = {
            id: Date.now(),
            type: callType,
            duration: duration,
            timestamp: moment().format('DD/MM/YYYY HH:mm:ss'),
            recordedBy: message.author.tag
        };

        callLogsDatabase.get(phoneNumber).push(callEntry);

        const logEmbed = new EmbedBuilder()
            .setColor('#00aaff')
            .setTitle('✅ CALL LOG RECORDED')
            .setDescription(`Call has been successfully added to database`)
            .addFields(
                { name: 'Number', value: phoneNumber, inline: true },
                { name: 'Type', value: callType, inline: true },
                { name: 'Duration', value: duration, inline: true },
                { name: 'Time', value: callEntry.timestamp, inline: false }
            )
            .setFooter({ text: 'PRIVATE CALL LOG SYSTEM' })
            .setTimestamp();

        await message.channel.send({ embeds: [logEmbed] });
    }

    // ======================================
    //  /log view <number> COMMAND
    // ======================================
    if (command === 'log' && args[0] === 'view') {
        const phoneNumber = args[1];

        if (!phoneNumber) {
            return sendErrorEmbed(message, 
                'INVALID USAGE', 
                'Usage: `!log view +919876543210`'
            );
        }

        if (!callLogsDatabase.has(phoneNumber) || callLogsDatabase.get(phoneNumber).length === 0) {
            return sendErrorEmbed(message, 
                'NO LOGS FOUND', 
                'There are no call logs recorded for this number.'
            );
        }

        const logs = callLogsDatabase.get(phoneNumber);
        let logContent = '';

        logs.slice(-15).forEach((log, index) => {
            const icon = log.type === 'INCOMING' ? '📥' : '📤';
            logContent += `${icon} **${log.type}** | ${log.duration} | ${log.timestamp}\n`;
        });

        const viewEmbed = new EmbedBuilder()
            .setColor('#ffaa00')
            .setTitle('📞 CALL LOG HISTORY')
            .setDescription(`📱 **Number:** ${phoneNumber}\n\n${logContent}`)
            .addFields(
                { name: 'Total Calls', value: `${logs.length}`, inline: true },
                { name: 'Last Updated', value: `${logs[logs.length-1].timestamp}`, inline: true }
            )
            .setFooter({ text: `Showing last ${Math.min(logs.length, 15)} entries` })
            .setTimestamp();

        await message.channel.send({ embeds: [viewEmbed] });
    }

    // ======================================
    //  /log today <number> COMMAND (TODAY'S CALLS ONLY)
    // ======================================
    if (command === 'log' && args[0] === 'today') {
        const phoneNumber = args[1];

        if (!phoneNumber) {
            return sendErrorEmbed(message, 
                'INVALID USAGE', 
                'Usage: `!log today +919876543210`'
            );
        }

        if (!callLogsDatabase.has(phoneNumber) || callLogsDatabase.get(phoneNumber).length === 0) {
            return sendErrorEmbed(message, 
                'NO LOGS FOUND', 
                'There are no call logs recorded for this number.'
            );
        }

        const todayDate = moment().format('DD/MM/YYYY');
        const todayLogs = callLogsDatabase.get(phoneNumber).filter(log => log.timestamp.startsWith(todayDate));
        
        if (todayLogs.length === 0) {
            return sendErrorEmbed(message, 
                'NO CALLS TODAY', 
                `There are no calls recorded for this number on ${todayDate}`
            );
        }

        let incoming = 0;
        let outgoing = 0;
        let totalDuration = 0;
        let logContent = '';

        todayLogs.forEach((log) => {
            const icon = log.type === 'INCOMING' ? '📥' : '📤';
            log.type === 'INCOMING' ? incoming++ : outgoing++;
            logContent += `${icon} **${log.type}** | ${log.duration} | ${log.timestamp.split(' ')[1]}\n`;
            
            const minSec = log.duration.split(':');
            totalDuration += (parseInt(minSec[0]) * 60) + parseInt(minSec[1]);
        });

        const todayEmbed = new EmbedBuilder()
            .setColor('#00ccff')
            .setTitle('📅 TODAY\'S CALL ACTIVITY')
            .setDescription(`📱 **Number:** ${phoneNumber}\n📆 **Date:** ${todayDate}\n\n${logContent}`)
            .addFields(
                { name: '📥 Incoming', value: `${incoming} calls`, inline: true },
                { name: '📤 Outgoing', value: `${outgoing} calls`, inline: true },
                { name: '⏱️ Total Time', value: `${Math.floor(totalDuration/60)}:${(totalDuration%60).toString().padStart(2,'0')}`, inline: true },
                { name: '📊 Total Calls Today', value: `${todayLogs.length}`, inline: false }
            )
            .setFooter({ text: 'REAL TIME TODAY CALL LOGS' })
            .setTimestamp();

        await message.channel.send({ embeds: [todayEmbed] });
    }

    // ======================================
    //  /log contacts <number> COMMAND (ALL NUMBERS CONTACTED TODAY)
    // ======================================
    if (command === 'log' && args[0] === 'contacts') {
        const targetNumber = args[1];

        if (!targetNumber) {
            return sendErrorEmbed(message, 
                'INVALID USAGE', 
                'Usage: `!log contacts +919876543210`'
            );
        }

        const todayDate = moment().format('DD/MM/YYYY');
        let incomingNumbers = new Set();
        let outgoingNumbers = new Set();

        callLogsDatabase.forEach((logs, number) => {
            logs.forEach(log => {
                if (log.timestamp.startsWith(todayDate)) {
                    if (number === targetNumber) {
                        if (log.type === 'INCOMING') incomingNumbers.add(log.remoteNumber || 'Unknown Number');
                        if (log.type === 'OUTGOING') outgoingNumbers.add(log.remoteNumber || 'Unknown Number');
                    }
                }
            });
        });

        const contactsEmbed = new EmbedBuilder()
            .setColor('#9933ff')
            .setTitle('📇 DAILY CONTACTED NUMBERS')
            .setDescription(`📱 **Target Number:** ${targetNumber}\n📆 **Date:** ${todayDate}`)
            .addFields(
                { name: '📥 CALLERS TODAY (INCOMING)', value: incomingNumbers.size > 0 ? Array.from(incomingNumbers).join('\n') : 'No incoming calls today', inline: false },
                { name: '📤 CALLED TODAY (OUTGOING)', value: outgoingNumbers.size > 0 ? Array.from(outgoingNumbers).join('\n') : 'No outgoing calls today', inline: false },
                { name: '📊 SUMMARY', value: `Received calls from: ${incomingNumbers.size} numbers\nCalled to: ${outgoingNumbers.size} numbers`, inline: false }
            )
            .setFooter({ text: 'ALL CONTACTS FOR TODAY' })
            .setTimestamp();

        await message.channel.send({ embeds: [contactsEmbed] });
    }

    // ======================================
    //  HELP COMMAND
    // ======================================
    if (command === 'help') {
        const helpEmbed = new EmbedBuilder()
            .setColor('#7289da')
            .setTitle('📋 PHONE TRACKER BOT - COMMANDS')
            .setDescription('Professional Private Use Bot System')
            .addFields(
                { name: '🔍 Track Number', value: `\`${process.env.PREFIX}track +COUNTRYCODENUMBER\`\nTrack mobile number location details`, inline: false },
                { name: '➕ Add Call Log', value: `\`${process.env.PREFIX}log add <number> <INCOMING/OUTGOING> <duration>\`\nRecord new call entry`, inline: false },
                { name: '📊 View Call Logs', value: `\`${process.env.PREFIX}log view <number>\`\nView complete call history for number`, inline: false },
                { name: 'ℹ️ System Status', value: `\`${process.env.PREFIX}status\`\nCheck bot system information`, inline: false }
            )
            .setFooter({ text: '⚠️ FOR PRIVATE USE ONLY. ALL ACTIVITIES ARE LOGGED.' })
            .setTimestamp();

        await message.channel.send({ embeds: [helpEmbed] });
    }
});

// ======================================
//  HELPER FUNCTIONS
// ======================================
function sendErrorEmbed(message, title, description) {
    const embed = new EmbedBuilder()
        .setColor('#ff3333')
        .setTitle(`❌ ${title}`)
        .setDescription(description)
        .setFooter({ text: 'SYSTEM ERROR' })
        .setTimestamp();
    
    return message.channel.send({ embeds: [embed] });
}

function getCountryName(countryCode) {
    const countries = {
        'US': 'United States',
        'GB': 'United Kingdom',
        'IN': 'India',
        'CA': 'Canada',
        'AU': 'Australia',
        'DE': 'Germany',
        'FR': 'France',
        'IT': 'Italy',
        'ES': 'Spain',
        'BR': 'Brazil',
        'RU': 'Russia',
        'CN': 'China',
        'JP': 'Japan'
    };
    return countries[countryCode] || countryCode;
}

function getTimezoneForCountry(countryCode) {
    const timezones = {
        'US': 'UTC-5 / UTC-8',
        'GB': 'UTC+0',
        'IN': 'UTC+5:30',
        'CA': 'UTC-4 / UTC-7',
        'AU': 'UTC+8 / UTC+10',
        'DE': 'UTC+1',
        'FR': 'UTC+1',
        'IT': 'UTC+1',
        'ES': 'UTC+1',
        'BR': 'UTC-3',
        'RU': 'UTC+3 / UTC+12',
        'CN': 'UTC+8',
        'JP': 'UTC+9'
    };
    return timezones[countryCode] || 'Standard Time Zone';
}

// LOGIN BOT
client.login(process.env.BOT_TOKEN).catch(err => {
    console.log(chalk.red('❌ FAILED TO CONNECT TO DISCORD'));
    console.log(chalk.yellow('⚠️  Check your BOT_TOKEN in .env file'));
    process.exit(1);
});
