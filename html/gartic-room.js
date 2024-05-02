(() => {
    const themes = [
        "Animais",
        "Objetos",
        "Comidas",
        "Profissões",
        "Países",
        "Cores",
        "Esportes",
        "Frutas"
    ];

    function appearOrDisappear(element, animationIn, animationOut) {
        if (element.css('display') !== "none") {
            element.css('animation', animationOut + ' 0.5s forwards');

            setTimeout(() => {
                element.css('animation', '').css('display', 'none');
            }, 500);
            return;
        }

        element.css('animation', animationIn + ' 0.5s forwards').css('display', '');

        setTimeout(() => {
            element.css('animation', '');
        }, 500);

        $(".room").removeClass('selected');
    }

    $('#open-rooms').on('click', function (e) {
        e.preventDefault();

        appearOrDisappear($('#rooms'), 'fadeInLeft', 'fadeOutLeft');

        if ($('#info').css('display') !== 'none') {
            appearOrDisappear($('#info'), 'bounceIn', 'bounceOut');
        }

        if ($('#sound').css('display') !== 'none') {
            appearOrDisappear($('#sound'), 'bounceIn', 'bounceOut');
        }

        if ($('#create-room-form').css('display') !== 'none') {
            appearOrDisappear($('#create-room-form'), 'bounceIn', 'bounceOut');
        }
    });

    $("#open-info").on("click", function (e) {
        e.preventDefault();

        appearOrDisappear($('#info'), 'fadeInLeft', 'fadeOutLeft');

        if ($('#rooms').css('display') !== 'none') {
            appearOrDisappear($('#rooms'), 'bounceIn', 'bounceOut');
        }

        if ($('#sound').css('display') !== 'none') {
            appearOrDisappear($('#sound'), 'bounceIn', 'bounceOut');
        }

        if ($('#create-room-form').css('display') !== 'none') {
            appearOrDisappear($('#create-room-form'), 'bounceIn', 'bounceOut');
        }
    });

    $("#open-sound").on("click", function (e) {
        e.preventDefault();

        appearOrDisappear($('#sound'), 'fadeInLeft', 'fadeOutLeft');

        if ($('#rooms').css('display') !== 'none') {
            appearOrDisappear($('#rooms'), 'bounceIn', 'bounceOut');
        }

        if ($('#info').css('display') !== 'none') {
            appearOrDisappear($('#info'), 'bounceIn', 'bounceOut');
        }

        if ($('#create-room-form').css('display') !== 'none') {
            appearOrDisappear($('#create-room-form'), 'bounceIn', 'bounceOut');
        }
    });

    $("#create-room").on("click", function (e) {
        e.preventDefault();

        appearOrDisappear($('#create-room-form'), 'fadeInLeft', 'fadeOutLeft');

        $('#create-room-form').find('select').val('geral');

        if ($('#rooms').css('display') !== 'none') {
            appearOrDisappear($('#rooms'), 'bounceIn', 'bounceOut');
        }

        if ($('#info').css('display') !== 'none') {
            appearOrDisappear($('#info'), 'bounceIn', 'bounceOut');
        }

        if ($('#sound').css('display') !== 'none') {
            appearOrDisappear($('#sound'), 'bounceIn', 'bounceOut');
        }
    });

    $(".rooms-close").on("click", function (e) {
        e.preventDefault();

        if ($('#rooms').css('display') !== 'none') {
            appearOrDisappear($('#rooms'), 'bounceIn', 'bounceOut');
        }

        if ($('#info').css('display') !== 'none') {
            appearOrDisappear($('#info'), 'bounceIn', 'bounceOut');
        }

        if ($('#sound').css('display') !== 'none') {
            appearOrDisappear($('#sound'), 'bounceIn', 'bounceOut');
        }

        if ($('#create-room-form').css('display') !== 'none') {
            appearOrDisappear($('#create-room-form'), 'bounceIn', 'bounceOut');
        }
    });

    function activeButton() {
        if ($("#room-theme").val()?.length) {
            $("#submit-room").prop("disabled", false);
        } else {
            $("#submit-room").prop("disabled", true);
        }
    }

    themes.forEach(theme => {
        $("#room-theme").append(`<option value="${theme}" style="">${theme}</option>`);
    });

    $("#room-theme").on("change", activeButton);

    $("#submit-room").on("click", function (e) {
        e.preventDefault();
        $('.chat-messages').empty();

        window.sendScriptMessage("createRoom", { theme: $("#room-theme").val() });

        activeButton();

        appearOrDisappear($('#create-room-form'), 'bounceIn', 'bounceOut');
    });

    appearOrDisappear($('.gartic-menu'), 'fadeIn', 'fadeOut');
    appearOrDisappear($('#rooms'), 'fadeInLeft', 'fadeOutLeft');
})();