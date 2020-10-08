var msPerDay = 60 * 60 * 24 * 1000;

var getToday = function() {
    return Math.floor(Date.now() / msPerDay);
};

var historicalData = [];

var createExampleDay = function(day) {
    return {
        day: day,
        sleep: Array.from({ length: 6 * 24 }, (_, i) => Math.random() > Math.sin((i / (6 * 24)) * Math.PI * 2) * 0.9 ? 0 : 1),
        exercise: Array.from({ length: 6 * 24 }, () => Math.random() < 0.8 ? 0 : Math.random() < 0.5 ? 1 : Math.random() < 0.3 ? 2 : 3),
        diet: Array.from({ length: 6 * 24 }, () => Math.random() < 0.95 ? 0 : 1),
    };
};

var createEmptyDay = function(day) {
    return {
        day: day,
        sleep: Array.from({ length: 6 * 24 }, () => 0),
        exercise: Array.from({ length: 6 * 24 }, () => 0),
        diet: Array.from({ length: 6 * 24 }, () => 0),
    };
};

var startDay = getToday();
for (var i = -500; i < 0; i++) {
    historicalData.push(createExampleDay(startDay + i));
}

var stateCategoricalNames = [
    ['Awake', 'Sleep'],
    ['None', 'Weight work', 'Aerobic', 'Treadmill'],
    ['Fasting', 'Eating'],
];

var emptyColor = '#cccccc';
var stateColors = ['#1c98d3', '#ba1cd3', '#d35d1c', '#1657d2', '#19b01a', '#93b019', '#afd31c'];
var dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
var dayToDayNames = ['S-M', 'M-T', 'T-W', 'W-T', 'T-F', 'F-S', 'S-S'];

$(function() {
    var days = historicalData.map(function(datum) {
        return datum.day;
    });

    var canvas = $('canvas')[0];
    canvas.width = 520;
    canvas.height = 570;

    var canvasPosition = {
        x: 0,
        y: 0,
    };

    var mousePressed = false;
    var mouseDown = false;
    var mouseUp = false;

    $(canvas).mousedown(function() {
        mousePressed = true;
        mouseDown = true;

        update();
    });

    $(document).mouseup(function() {
        mouseUp = mouseDown;
        mouseDown = false;

        update();
    });

    $(canvas).mousemove(function(e) {
        var rect = canvas.getBoundingClientRect();

        var x = (e.clientX - rect.left) / rect.width * canvas.width;
        var y = (e.clientY - rect.top) / rect.height * canvas.height;

        canvasPosition.x = x;
        canvasPosition.y = y;

        if (mouseDown) {
            update();
        }
    });

    var ctx = canvas.getContext('2d');

    var dayMin = Math.min.apply(null, days);
    var selectedDay = getToday();

    var categoryId = 0;
    var modeId = 0;

    $('.tabs-category').tabs({
        heightStyle: 'fill',
        active: 0,
        activate: function(event, ui) {
            categoryId = parseInt($(event.currentTarget).data('id'));

            update();
        },
    });

    $('.tabs-mode').tabs({
        heightStyle: 'fill',
        active: 0,
        activate: function(event, ui) {
            modeId = parseInt($(event.currentTarget).data('id'));
            canvasOffsetX = null;

            update();
        },
    });

    $(window).resize(function() {
        $('tabs-category').tabs('refresh');
        $('tabs-mode').tabs('refresh');
    });

    $('.button-previous-date').button({
        icon: 'ui-icon-circle-arrow-w',
    });

    $('.button-next-date').button({
        icon: 'ui-icon-circle-arrow-e',
    });

    $('.button-previous-date').click(function(event) {
        if (selectedDay <= dayMin) {
            return;
        }
        selectedDay--;

        update();
    });
    $('.button-next-date').click(function(event) {
        selectedDay++;

        update();
    });

    var update = function() {
        $('.date').text(new Date(selectedDay * msPerDay).toUTCString().split(' ').splice(0, 4).join(' '));

        switch (modeId) {
            case 0:
                updateSummary();

                break;

            case 1:
                updateRecord();

                break;
        }
    };

    var updateSummary = function() {
        canvas.width = 520;

        var stateNames = stateCategoricalNames[categoryId];

        var stateSum = stateNames.map(function() {
            return 0;
        });
        var statesByDay = Array.from({ length: 7 }, function() {
            return stateNames.map(function() {
                return 0;
            });
        });
        var statesByHour = Array.from({ length: 24 }, function() {
            return stateNames.map(function() {
                return 0;
            });
        });

        for (var dayOffset = 0; dayOffset < 7; dayOffset++) {
            var day = selectedDay - 6 + dayOffset;

            var dataDay = historicalData.filter(function(datum) {
                return datum.day === day;
            });

            if (dataDay.length === 0) {
                continue;
            }

            var hourlyStates = categoryId === 0 ? dataDay[0].sleep : categoryId === 1 ? dataDay[0].exercise : dataDay[0].diet;
            var dailyStates = hourlyStates;

            if (categoryId === 0) {
                var dataNextDay = historicalData.filter(function(datum) {
                    return datum.day === day + 1;
                });

                dailyStates = Array.from({ length: 6 * 24 }, function() {
                    return 0;
                });

                for (var hour = 0; hour < 24; hour++) {
                    for (var i = 0; i < 6; i++) {
                        dailyStates[hour * 6 + i] = hour < 12 ? dataNextDay.length === 0 ?
                            0 : dataNextDay[0].sleep[hour * 6 + i] : dataDay[0].sleep[hour * 6 + i];
                    }
                }
            }

            dailyStates.forEach(function(id) {
                statesByDay[dayOffset][id]++;
            });
            hourlyStates.forEach(function(id, min10Index) {
                stateSum[id]++;
                statesByHour[Math.floor(min10Index / 6)][id]++;
            });
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.textAlign = 'center';

        ctx.font = '25px Verdana';

        ctx.fillStyle = '#ffffff';
        ctx.fillText(
            categoryId === 0 ? 'WEEKLY SLEEP SUMMARY' :
            categoryId === 1 ? 'WEEKLY EXERCISE SUMMARY' : 'WEEKLY DIET SUMMARY', 255, 37);

        ctx.font = '15px Verdana';

        ctx.lineWidth = 2;

        for (var dayOffset = 0; dayOffset < 7; dayOffset++) {
            var day = selectedDay - 6 + dayOffset;
            var dow = new Date(Math.round(day * msPerDay)).getDay();

            var sum = 0;
            stateNames.forEach(function(name, id) {
                var count = statesByDay[dayOffset][id];

                ctx.fillStyle = stateColors[id];

                ctx.fillRect(30 + dayOffset * 70, 200 - sum - count, 40, count);

                sum += count;
            });

            ctx.fillStyle = emptyColor;
            ctx.fillRect(30 + dayOffset * 70, 200 - sum - 6 * 24 - sum, 40, 6 * 24 - sum);

            if (day === getToday()) {
                ctx.strokeStyle = '#d35d1c';
                ctx.strokeRect(27 + dayOffset * 70, 53, 46, 150);
            }

            ctx.fillStyle = day === getToday() ? '#d35d1c' : '#000000';
            ctx.fillText(categoryId === 0 ? dayToDayNames[dow] : dayNames[dow], 49 + dayOffset * 70, 220);
        }

        for (var hour = 0; hour <= 24; hour++) {
            var sum = 0;
            if (hour < 24) {
                stateNames.forEach(function(name, id) {
                    var count = statesByHour[hour][id];

                    ctx.fillStyle = stateColors[id];

                    ctx.fillRect(20 + hour * 20, 280 - sum * 1 - count * 1, 12, count * 1);

                    sum += count;
                });
            }

            ctx.fillStyle = emptyColor;
            ctx.fillRect(20 + hour * 20, 280 - sum * 1 - (7 * 6 - sum) * 1, 12, (7 * 6 - sum) * 1);

            if (hour % 6 === 0) {
                ctx.textAlign = hour === 0 ? 'left' : hour === 24 ? 'right' : 'center';
                ctx.fillStyle = '#000000';
                ctx.fillText(hour.toString().length === 1 ? '0' + hour + ':00' : hour + ':00', 15 + hour * 20, 300);
                ctx.fillRect(15 + hour * 20, 230, 2, 55);
            }
        }

        ctx.textAlign = 'left';

        stateNames.forEach(function(name, id) {
            ctx.fillStyle = stateColors[id];
            ctx.fillRect(25, 330 + id * 30, 20, 20);

            ctx.strokeStyle = '#000000';
            ctx.strokeRect(25, 330 + id * 30, 20, 20);

            ctx.fillStyle = '#000000';
            ctx.fillText(stateNames[id] + ' (' + (stateSum[id] * (10 / 60)).toFixed(2) + ' hours)', 55, 346 + id * 30);
        });

        if (categoryId !== 0) {
            return;
        }

        ctx.textAlign = 'center';
        ctx.font = '25px Verdana';

        ctx.fillText('PREDICTIONS', 260, 414);

        var warningHeight = 0;

        for (var dayOffset = 0; dayOffset < 6; dayOffset++) {
            var day = selectedDay - 6 + dayOffset;
            var dow = new Date(Math.round(day * msPerDay)).getDay();

            const dayName = categoryId === 0 ? dayToDayNames[dow] : dayNames[dow];

            if (statesByDay[dayOffset][1] < 7 * 6 && statesByDay[dayOffset][0] > 0) {
                ctx.fillStyle = '#0000ff';

                ctx.font = '40px Verdana';
                ctx.textAlign = 'center';
                ctx.fillText(String.fromCharCode(0x26A0), 50 + dayOffset * 70, 195);

                ctx.font = '20px Verdana';
                ctx.textAlign = 'left';
                ctx.fillText(String.fromCharCode(0x26A0) + ' NOT ENOUGH SLEEP (' + (statesByDay[dayOffset][1] * (10 / 60)).toFixed(2) + ' hours at ' + dayName + ')', 20, 450 + warningHeight);

                warningHeight += 30;
            }
        }
    };

    var updateRecord = function() {
        canvas.width = 4250;

        var dataDays = historicalData.filter(function(datum) {
            return datum.day === selectedDay;
        });
        var dataDay = dataDays.length === 0 ? createEmptyDay(selectedDay) : dataDays[0];
        if (dataDays.length === 0) {
            historicalData.push(dataDay);
        }

        var states = categoryId === 0 ? dataDay.sleep : categoryId === 1 ? dataDay.exercise : dataDay.diet;

        var stateNames = stateCategoricalNames[categoryId];

        const offsetX = 0;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.textAlign = 'center';

        ctx.font = '25px Verdana';

        ctx.fillStyle = '#ffffff';
        ctx.fillText('ACTIVITY RECORD', 255, 37);

        var buttonOffset = 180;
        var buttonStep = 27;
        var buttonSizeX = 22;
        var buttonSizeY = 42;

        for (var hour = 0; hour <= 24; hour++) {
            stateNames.forEach(function(name, id) {
                for (var i = 0; i < 6; i++) {
                    var buttonX = buttonOffset + (hour * 6 + i) * buttonStep + offsetX;
                    var buttonY = 80 + id * 50;

                    if (mousePressed && canvasPosition.x > buttonOffset &&
                        canvasPosition.x >= buttonX && canvasPosition.x <= buttonX + buttonSizeX + 5 &&
                        canvasPosition.y >= buttonY && canvasPosition.y <= buttonY + buttonSizeY + 7) {
                        states[hour * 6 + i] = states[hour * 6 + i] === id ? 0 : id;
                        mousePressed = false;
                    }
                }
            });
        }

        for (var hour = 0; hour <= 24; hour++) {
            ctx.textAlign = hour === 0 ? 'left' : hour === 24 ? 'right' : 'center';
            ctx.fillStyle = '#000000';
            ctx.fillText(hour.toString().length === 1 ? '0' + hour + ':00' : hour + ':00', buttonOffset + hour * 6 * buttonStep + offsetX - 5, 470);
            ctx.fillRect(buttonOffset + hour * 6 * buttonStep + offsetX - 3, 70, 2, 380);

            stateNames.forEach(function(name, id) {
                for (var i = 0; i < 6; i++) {
                    var buttonX = buttonOffset + (hour * 6 + i) * buttonStep + offsetX;
                    var buttonY = 80 + id * 50;

                    ctx.fillStyle = states[hour * 6 + i] === id ? stateColors[id] : emptyColor;
                    ctx.fillRect(buttonX, buttonY, buttonSizeX, buttonSizeY);
                }
            });
        }

        ctx.clearRect(0, 0, buttonOffset - 4, canvas.height);

        ctx.font = '20px Verdana';

        ctx.textAlign = 'center';

        stateNames.forEach(function(name, id) {
            ctx.fillStyle = stateColors[id];
            ctx.fillText(name, 180 / 2, 105 + id * 50);
        });
    };

    update();
});
